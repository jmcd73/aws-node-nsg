# Add and Delete AWS Security Group Rules

## Overview
This is a node app that checks your local IPv4 and 6 external internet addresses and creates an inbound allow rule tagged with a description of your choosing in a Amazon Web Services Security Group

I use this to provide quick SSH access to EC2 instances from whichever site I'm currently at without logging into the AWS console and manually adding rules

## What it does
Firstly it connects to your AWS Account and downloads the Security Group

Secondly it compares your current ingress rules that have a description that starts with the descriptionPrefix set in settings.js with the rules specified in settings.js and revokes any rules that are no longer specified in settings.js

Then it will connect to a PHP script located at `ipCheckUrl`. When it connects to this endpoint it will make a request over both IPv4 and IPv6 to find your IP Addresses

It checks the inbound Security Group rules to see if a rule exists for the Protocol, IP and Port configuration as set in the `settings.js` file. It also must have a description that starts with the descriptionPrefix you configure in `settings.js`.

If a rule doesn't exist it creates one - Allowing access to your EC2 instance on the ports your specify from the computer you run this from

If it finds a rule that matches it skips adding a rule.

If it finds a rule that matches the Protocol and Port and begins with the `descriptionPrefix` but does not match IP address it deletes the rule.

## How to use
**Note:** I have developed this on a macbook. It should work on Linux without too much trouble but may need massaging to run on Windows

Install aws cli and authenticate with your AWS account with enough permissions to edit Security Groups

Clone the repo

```
git clone https://github.com/jmcd73/aws-node-nsg.git aws-node-nsg
cd aws-node-nsg
npm install
```

Copy the ip_check.php script to a PHP enabled webserver on the internet. Use curl to test it is working

```
# should output an IPv4 address
curl -4 https://example.com/ip_check.php

# should output an IPv6 address
curl -6 https://example.com/ip_check.php
```

edit settings.js and add the URL of where you copied the `ip_check.php` script, the security group name and rules for the ports you want to open e.g.

```javascript

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
 descriptionPrefix: "SGTAG"
};
```

Run every time you find that can't connect to your EC2 instance from your computer
```
npm run start
# for testing uses settings-test.js instead of settings.js
npm run testing
```

![Example output](img/example_output.png)

Note in this image the `descriptionPrefix` has been set to SGTAG when the script runs it will look for that in the description so it knows what it can delete and what it should leave untouched
![Example inbound rules](img/aws_inbound_rules.png)

## What is missing
Currently it will keep track of rules in the settings.js but if you remove the rule it won't go in and delete that rule.

Todo: add a function to remove rules that have the descriptionPrefix but no corresponding rule in the settings.js
