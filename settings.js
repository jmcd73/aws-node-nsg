
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
 securityGroupName: "securitygrouptest01", //sgWebTest01, securitygrouptest01
 ipCheckUrl: "https://example.com/ip_check.php",
 descriptionPrefix: "SGTAG"
};

module.exports = settings;