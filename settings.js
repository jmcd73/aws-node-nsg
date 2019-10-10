
const settings = {
  rulesToAdd: [
    {
      protocol: "tcp",
      fromPort: 22,
      toPort: 22,
      suffix: "SSH"
    },
    {
      protocol: "tcp",
      fromPort: 5434,
      toPort: 5434,
      suffix: "POSTGRES"
    }
 ],
 securityGroupName: "sgWeb01", //sgWebTest01, sgWeb01
 ipCheckUrl: "https://toggen.com.au/ip_check.php",
 descriptionPrefix: "SGEDIT"
};

module.exports = settings;