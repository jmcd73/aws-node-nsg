const { spawnSync, execFileSync, execFile } = require("child_process");
const fs = require("fs");
const isIp = require("is-ip");
const jspath = require("jspath");

const getIPAddress = require("./http");
const settings = require("./settings");

const {
  securityGroupName,
  rulesToAdd,
  ipCheckUrl,
  descriptionPrefix
} = settings;

const getSecurityGroup = sgName => {
  const securityGroup = execFileSync("aws", [
    "ec2",
    "describe-security-groups",
    "--group-names",
    sgName
  ]);
  return JSON.parse(securityGroup.toString("utf8"));
};

const getAllRulesMatchingDescriptionPrefix = (
  securityGroupJSON,
  descriptionPrefix
) => {
  const patterns = [
    `.SecurityGroups.IpPermissions{..Description ^== "${descriptionPrefix}"}`
  ];

  const ipPermissions = patterns.reduce((accum, current) => {
    return accum.concat(jspath.apply(current, securityGroupJSON));
  }, []);

  const filterPattern = [
    {
      pattern: `.IpRanges{.Description ^== "${descriptionPrefix}"}`,
      slug: "IpRanges"
    },
    {
      pattern: `.Ipv6Ranges{.Description ^== "${descriptionPrefix}"}`,
      slug: "Ipv6Ranges"
    }
  ];
  const allMatchingRules = ipPermissions.map(obj => {
    let newObj = { ...obj };

    const specificRanges = filterPattern.map(filterObject => {
      newObj = {
        ...newObj,
        [filterObject.slug]: jspath.apply(filterObject.pattern, obj)
      };
    }, []);
    return newObj;
  });

  return allMatchingRules;
};

const getMatchingRulesNotInSettings = (rulesToCheck, matchingRules) => {
  const rulesNotInSG = matchingRules.filter(obj => {
    const { FromPort, ToPort, IpProtocol } = obj;
    return (
      rulesToCheck.filter(rules => {
        const { protocol, fromPort: fromP, toPort: toP } = rules;
        return protocol === IpProtocol && fromP === FromPort && toP === ToPort;
      }).length === 0
    );
  }).map( val => {
    delete val.PrefixListIds;
    delete val.UserIdGroupPairs;
    return val
  });

  return rulesNotInSG
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
  return {
    ipRangeName,
    cidrIpName
  };
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
    '{.' +
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

const buildRule = (protocol, fromPort, toPort, cidr, description = "") => {
  const { ipRangeName, cidrIpName } = getPropertyNamesForIPVersion(cidr);
  // JSON format for this is the output of
  // aws ec2 revoke-security-group-ingress --generate-cli-skeleton
  const ipRuleJSON = {
    IpPermissions: [
      {
        IpProtocol: protocol,
        FromPort: fromPort,
        ToPort: toPort,
        [ipRangeName]: [{ [cidrIpName]: cidr }]
      }
    ]
  };
  if (description) {
    ipRuleJSON.IpPermissions[0][ipRangeName][0].Description = description;
  }

  return JSON.stringify(ipRuleJSON);
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
      ipRange
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

const revokeRule = (securityGroupName, ipRule) => {
  console.log(ipRule)
  execFile(
    "aws",
    [
      "ec2",
      "revoke-security-group-ingress",
      "--group-name",
      securityGroupName,
      "--cli-input-json",
      ipRule
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

const deleteOldRules = (
  securityGroupName,
  protocol,
  fromPort,
  toPort,
  cidr,
  descriptionPrefix,
  securityGroupJSON
) => {
  const oldRules = getOldRules(
    protocol,
    fromPort,
    toPort,
    cidr,
    descriptionPrefix,
    securityGroupJSON
  );
  //aws ec2 revoke-security-group-ingress --group-name WebDMZ --protocol tcp --port 22 --cidr 101.161.76.223/32

  if (oldRules.length > 0) {
    const message = [oldRules.join(","), protocol, fromPort + "-" + toPort];

    console.log("Deleting " + message.join(" "));
    oldRules.map(value => {
      const ipRule = buildRule(protocol, fromPort, toPort, value);
      revokeRule(securityGroupName, ipRule);
    });
  } else {
    console.log("No old rules to delete");
  }
};

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

module.exports = {
  createCidrsFromIps,
  createRulesObject,
  rulesToAdd,
  addRule,
  getSecurityGroup,
  getAllRulesMatchingDescriptionPrefix,
  getMatchingRulesNotInSettings,
  revokeRule
};
