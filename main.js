const getIPAddress = require("./http.js");

const env = process.env.TEST ? '-test' : '';

const {
  ipCheckUrl,
  securityGroupName,
  descriptionPrefix,
  rulesToAdd
} = require(`./settings${env}.js`);


const {
  getSecurityGroup,
  createCidrsFromIps,
  createRulesObject,
  addRule,
  getMatchingRulesNotInSettings,
  getAllRulesMatchingDescriptionPrefix,
  revokeRule
} = require("./sgEdit");


let ourRuleSet = rulesToAdd;
const securityGroupJSON = getSecurityGroup(securityGroupName);

const logj = content => {
  console.log(JSON.stringify(content, null, 2));
};
//logj(securityGroupJSON)
const allMatchingRules = getAllRulesMatchingDescriptionPrefix(
  securityGroupJSON,
  descriptionPrefix
);
const rulesToRevoke = getMatchingRulesNotInSettings(
  ourRuleSet,
  allMatchingRules
);

if (rulesToRevoke.length > 0) {
  console.log(
    `Revoking rules tagged with ${descriptionPrefix} that are no longer in rule set`
  );
  revokeRule(
    securityGroupName,
    JSON.stringify({ IpPermissions: rulesToRevoke })
  );
}

/* run two checks one for IPv4 address and they other for IPv6 */
Promise.all([getIPAddress(ipCheckUrl, 4), getIPAddress(ipCheckUrl, 6)])
  .then(data => {
    const cidrs = createCidrsFromIps(data).filter(x => x);

    console.log("Our external CIDR IPs are:\n", cidrs.join(" & "));

    const newRules = createRulesObject(cidrs, ourRuleSet);

    newRules.forEach(obj => {
      addRule(
        securityGroupName,
        obj.protocol,
        obj.fromPort,
        obj.toPort,
        obj.cidr,
        descriptionPrefix + " " + obj.suffix,
        securityGroupJSON
      );
    });
  })
  .catch(e => {
    console.log(e);
  });
