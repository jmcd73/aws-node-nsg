const { spawnSync, execFileSync, execFile } = require("child_process");
const fs = require("fs");
const isIp = require("is-ip");
const jspath = require("jspath");

const getIPAddress = require("./http");
const settings = require('./settings');

const { securityGroupName, rulesToAdd, ipCheckUrl, descriptionPrefix } = settings

const getSecurityGroup = sgName => {
  const securityGroup = execFileSync("aws", [
    "ec2",
    "describe-security-groups",
    "--group-names",
    sgName
  ]);
  return JSON.parse(securityGroup.toString("utf8"));
};
/**
 *
 * @param {string} cidr
 */
const getPropertyNamesForIPVersion = cidr => {

  let ipRangeName = "IpRanges";
  let cidrIpName = "CidrIp";
  if (isIp.v6(cidr.split("/")[0])) {
    ipRangeName = "Ipv6Ranges";
    cidrIpName = "CidrIpv6";
  }

  return { ipRangeName, cidrIpName };
};
const isDuplicate = (
  protocol,
  fromPort,
  toPort,
  cidr,
  descriptionPrefix,
  sgJSON
) => {

  const { ipRangeName, cidrIpName } = getPropertyNamesForIPVersion(cidr);

  const pattern =
    ".SecurityGroups.IpPermissions{.FromPort === " +
    fromPort +
    " && .ToPort === " +
    toPort +
    ' && .IpProtocol === "' +
    protocol +
    '"}.' +
    ipRangeName +
    '{.Description ^== "' +
    descriptionPrefix +
    '" && .' +
    cidrIpName +
    ' === "' +
    cidr +
    '" }.' +
    cidrIpName;

  return jspath.apply(pattern, sgJSON).length > 0;
};

const getOldRules = (
  protocol,
  fromPort,
  toPort,
  cidr,
  descriptionPrefix,
  sgJSON
) => {
  const { ipRangeName, cidrIpName } = getPropertyNamesForIPVersion(cidr);

  const pattern =
    ".SecurityGroups.IpPermissions{.FromPort === " +
    fromPort +
    " && .ToPort === " +
    toPort +
    ' && .IpProtocol === "' +
    protocol +
    '"' +
    "}." +
    ipRangeName +
    '{.Description ^== "' +
    descriptionPrefix +
    '" && .' +
    cidrIpName +
    ' !== "' +
    cidr +
    '" }.' +
    cidrIpName;
  return jspath.apply(pattern, sgJSON);
};

const buildRule = (protocol, fromPort, toPort, cidr, description) => {
  const { ipRangeName, cidrIpName } = getPropertyNamesForIPVersion(cidr);

  return {
    IpPermissions: [
      {
        IpProtocol: protocol,
        FromPort: fromPort,
        ToPort: toPort,
        [ipRangeName]: [{ [cidrIpName]: cidr, Description: description }]
      }
    ]
  };
};

const runAddRule = (ipRange, securityGroupName) => {
  execFile(
    "aws",
    [
      "ec2",
      "authorize-security-group-ingress",
      "--group-name",
      securityGroupName,
      "--cli-input-json",
      JSON.stringify(ipRange)
    ],
    { shell: false },
    (error, stdout, stderr) => {
      if (error) {
        throw error;
      }
      console.log("STDOUT", stdout);
      console.log("STDERR", stderr);
    }
  );
};

const addRule = (
  securityGroupName,
  protocol,
  fromPort,
  toPort,
  cidr,
  descriptionPrefix,
  sgJSON
) => {
  $isDup = isDuplicate(
    protocol,
    fromPort,
    toPort,
    cidr,
    descriptionPrefix,
    sgJSON
  );
  if ($isDup) {
    console.log(
      "Rule exists! No need to add... " +
        [cidr, fromPort + "-" + toPort, protocol, securityGroupName].join(" ")
    );
  } else {
    const ruleJSON = buildRule(
      protocol,
      fromPort,
      toPort,
      cidr,
      descriptionPrefix
    );
    console.log(
      "Adding Rule... " +
        [cidr, fromPort + "-" + toPort, protocol, securityGroupName].join(" ")
    );
    runAddRule(ruleJSON, securityGroupName);
  }

  deleteOldRules(
    securityGroupName,
    protocol,
    fromPort,
    toPort,
    cidr,
    descriptionPrefix,
    sgJSON
  );
};

const deleteOldRules = (
  securityGroupName,
  protocol,
  fromPort,
  toPort,
  cidr,
  descriptionPrefix,
  jsonSG
) => {
  const oldRules = getOldRules(
    protocol,
    fromPort,
    toPort,
    cidr,
    descriptionPrefix,
    jsonSG
  );
  //aws ec2 revoke-security-group-ingress --group-name WebDMZ --protocol tcp --port 22 --cidr 101.161.76.223/32
  if (oldRules.length > 0) {
    const message = [oldRules.join(","), protocol, fromPort + "-" + toPort];
    console.log("Deleting " + message.join(" "));
    oldRules.map(value => {
      execFile(
        "aws",
        [
          "ec2",
          "revoke-security-group-ingress",
          "--group-name",
          securityGroupName,
          "--protocol",
          protocol,
          "--port",
          fromPort + "-" + toPort,
          "--cidr",
          value
        ],
        { shell: false },
        (error, stdout, stderr) => {
          if (error) {
            throw error;
          }
          console.log("STDOUT", stdout);
          console.log("STDERR", stderr);
        }
      );
    });
  } else {
    console.log("No old rules to delete");
  }
};

const jsonSG = getSecurityGroup(securityGroupName);

const createCidrsFromIps = (ipAddresses = []) => {
  return ipAddresses.map(value => {
    if (isIp.v6(value)) {
      return value + "/128";
    }
    if (isIp.v4(value)) {
      return value + "/32";
    }
  });
};

const createRulesObject = (cidrs, rulesToAdd) => {
  let newRules = [];

  cidrs.forEach(cidr => {
    rulesToAdd.forEach(rule => {
      ruleObj = { ...rule, cidr: cidr };
      newRules = newRules.concat(ruleObj);
    });
  });

  return newRules;
};

/* run two check one for IPv4 address and they other for IPv6 */
Promise.all([
  getIPAddress(ipCheckUrl, 4),
  getIPAddress(ipCheckUrl, 6)
])
  .then(data => {

    const cidrs = createCidrsFromIps(data).filter( x => x );

    console.log("Our external CIDR IPs are:\n", cidrs.join(' & '));

    const newRules = createRulesObject(cidrs, rulesToAdd);

    newRules.forEach(obj => {
      addRule(
        securityGroupName,
        obj.protocol,
        obj.fromPort,
        obj.toPort,
        obj.cidr,
        descriptionPrefix + " " + obj.suffix,
        jsonSG
      );
    });
  })

  .catch(e => {
    console.log(e);
  });

//addRule(securityGroupName,'tcp', 22, 22, ip, descriptionPrefix + ' SSH', jsonSG);
//addRule(securityGroupName, 'tcp', 5434, 5434, ip, descriptionPrefix + ' POSTGRES', jsonSG);
