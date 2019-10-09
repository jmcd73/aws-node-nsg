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
      fromPort: 8999,
      toPort: 8999,
      suffix: "POSTGRES"
    },
    {
      protocol: "tcp",
      fromPort: 9999,
      toPort: 9999,
      suffix: "SECRETPORT"
    }
  ],
  securityGroupName: "sgWebTest01",
  ipCheckUrl: "https://toggen.com.au/ip_check.php",
  descriptionPrefix: "SGEDIT"
};

module.exports = settings;
