<?php
require '/var/www/html/vendor/autoload.php';
require '/var/www/html/docroot/plugins/ImageCrafterGuardBundle/EventListener/SendGuard.php';
use MauticPlugin\ImageCrafterGuardBundle\EventListener\SendGuard;
$now = strtotime('2026-09-23 00:00:00 UTC');
$contact = [
    'email' => 'consenting@example.org', 'ic_marketing_ok' => 1,
    'ic_consent_at' => '2026-09-22 18:00:00', 'ic_captured_at' => '2026-09-22 17:00:00',
    'ic_stage' => 'previewer', 'ic_source' => 'preview', 'ic_purchased_at' => null,
    'ic_return_url' => 'https://imagecrafter.app/api/portraits/return#id=qa&token='.str_repeat('a', 64),
    'ic_return_expires_at' => '2026-09-29 17:00:00',
];
$cases = [
    ['eligible preview', 72, $contact, [], false, true],
    ['converted while queued', 72, array_replace($contact, ['ic_stage'=>'buyer','ic_source'=>'purchase','ic_purchased_at'=>'2026-09-22 19:00:00']), [], false, false],
    ['stale preview with purchase history', 74, array_replace($contact, ['ic_purchased_at'=>'2026-09-22 19:00:00']), [], false, false],
    ['unsubscribed while queued', 75, $contact, [], true, false],
    ['withdrawn consent', 72, array_replace($contact, ['ic_marketing_ok'=>0]), [], false, false],
    ['unknown consent', 72, array_replace($contact, ['ic_marketing_ok'=>null]), [], false, false],
    ['test contact', 72, $contact, ['internal-test'], false, false],
    ['internal domain', 72, array_replace($contact, ['email'=>'qa@xencolabs.com']), [], false, false],
    ['historical capture', 72, array_replace($contact, ['ic_captured_at'=>'2026-09-18 12:00:00']), [], false, false],
    ['expired return', 72, array_replace($contact, ['ic_return_expires_at'=>'2026-09-22 19:00:00']), [], false, false],
    ['public URL not recovery', 72, array_replace($contact, ['ic_return_url'=>'https://imagecrafter.app/p/qa']), [], false, false],
    ['unrelated property untouched', 69, [], [], true, true],
];
$buyer = array_replace($contact, ['ic_stage'=>'buyer','ic_source'=>'purchase','ic_purchased_at'=>'2026-09-22 19:00:00','ic_purchase_type'=>'single']);
$cases[] = ['buyer care', 70, $buyer, [], false, true];
$cases[] = ['unverified pack offer', 73, $buyer, [], false, false];
$cases[] = ['verified pack offer', 73, $buyer, ['ic-pack-verified'], false, true];
foreach ($cases as [$name,$id,$c,$tags,$dnc,$expected]) {
    if (SendGuard::eligible($id,$c,$tags,$dnc,$now) !== $expected) throw new RuntimeException('FAIL '.$name);
    echo 'PASS '.$name.PHP_EOL;
}
