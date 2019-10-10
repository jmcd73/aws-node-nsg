
const settings = {
  rulesToAdd: [
    {
      protocol: "tcp",
      fromPort: 22,
      toPort: 22,
      suffix: "SSH"
    }
 ],
 securityGroupName: "securitygrouptest01", //sgWebTest01, securitygrouptest01
 ipCheckUrl: "https://example.com/ip_check.php",
 descriptionPrefix: "SGTAG"
};

module.exports = settings;