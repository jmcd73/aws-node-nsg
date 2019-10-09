# Add your local workstation IPv4 and v6 Addresses to the inbound rules set of an Amazon Web Services Network Security Group

## What does this do?
This is a node app that uses the aws-cli to query and edit a Amazon Web Services Network Security Group

Firstly it will connect to PHP script `ipCheckUrl` which you copy to a web accessible location on the internet. When it connects to this endpoint it will make a request over over both IPv4 and IPv6 to find your IP Addresses

It then connects to your AWS Account and downloads the Network Security Group

It checks the inbound Network Security Group rules to see if a rule exists for the Protocol, IP and Port configuration as set in the `settings.js` file. It also must have a description that starts with the descriptionPrefix you configure in `settings.js`.

If a rule doesn't exist it creates one - Allowing access to your EC2 instance on the ports your specify from the computer you run this from

If it finds a rule that matches it skips adding a rule.

If it finds a rule that matches the Protocol and Port and begins with the `descriptionPrefix` but does not match IP address it deletes the rule.

## How to use
Note: I have developed this on a macbook. It should work on Linux without too much trouble but may need massaging to run on Windows

Install aws cli and authenticate with your AWS account with enough permissions to edit Network Security Groups

clone the repo

```
git clone repo-url aws-node-nsg
cd aws-node-nsg
npm install
```

Copy the ip_check.php script to a PHP enabled webserver on the internet

edit settings.js and add rules for the ports you want to open e.g.

```json

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
    }
 ],
 securityGroupName: "YourSGName",
 ipCheckUrl: "https://<your server>/ip_check.php",
 descriptionPrefix: "NSGEDIT"
};
```

Run every time you find that can't connect to your EC2 instance from your computer
```
npm run start
```
