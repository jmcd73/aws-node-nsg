<?php

$scheme = $_SERVER['REQUEST_SCHEME'];
$host = $_SERVER['HTTP_HOST'];
$script = $_SERVER['SCRIPT_NAME'];
$scriptName = $scheme . "://" . $host . $script;

$msg[0] = "This is a script that echos back your IP address.";
$msg[1] = "use curl -4 $scriptName for your IPv4 address";
$msg[2] = "use curl -6 $scriptName for your IPv6 address";
$i = 0;
header('Content-type: text/plain');
foreach ($msg as $m) {
    $i++;
    header("X-About-$i: $m");
}

echo $_SERVER['REMOTE_ADDR'];
