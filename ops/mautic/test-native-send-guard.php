<?php
require '/var/www/html/vendor/autoload.php';
require '/var/www/html/docroot/app/console-application.php';
$kernel->boot();
$container = $kernel->getContainer();
$db = $container->get('doctrine.dbal.default_connection');
$em = $container->get('doctrine.orm.entity_manager');
$dispatcher = $container->get('event_dispatcher');
$model = $container->get('mautic.email.model.email');
use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event\EmailSendEvent;
use Mautic\EmailBundle\Helper\MailHelper;
use Mautic\EmailBundle\EventListener\MessageQueueSubscriber;
use Mautic\ChannelBundle\Entity\MessageQueue;
use Mautic\ChannelBundle\Event\MessageQueueBatchProcessEvent;

$observed = [];
// Independent last-resort test interception: no case may reach SMTP.
$dispatcher->addListener(EmailEvents::EMAIL_PRE_SEND, function (EmailSendEvent $event) use (&$observed) {
    $observed[] = $event->isSkip();
    $event->enableSkip();
}, -4096);
$schema = $db->fetchFirstColumn("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leads'");
foreach (['id','email','ic_stage','ic_source','ic_marketing_ok','ic_captured_at','ic_consent_at','ic_return_url','ic_return_expires_at','ic_purchased_at'] as $field) {
    if (!in_array($field,$schema,true)) throw new RuntimeException('Schema missing '.$field);
}
$db->beginTransaction();
try {
    $contact = $db->fetchAssociative('SELECT id,email FROM leads WHERE id=7244');
    if ($contact['email'] !== 'ic-launch-preview-image-20260922@xencolabs.com') throw new RuntimeException('Wrong QA identity');
    $db->executeStatement('DELETE FROM lead_tags_xref WHERE lead_id=7244');
    $db->update('leads', [
        'email'=>'ic-qa-rollback@example.org','ic_marketing_ok'=>1,
        'ic_captured_at'=>gmdate('Y-m-d H:i:s',time()-3600), 'ic_consent_at'=>gmdate('Y-m-d H:i:s',time()-1800),
        'ic_stage'=>'previewer','ic_source'=>'preview','ic_purchased_at'=>null,
        'ic_return_url'=>'https://imagecrafter.app/api/portraits/return#id=qa&token='.str_repeat('a',64),
        'ic_return_expires_at'=>gmdate('Y-m-d H:i:s',time()+86400),
    ], ['id'=>7244]);
    $em->clear();
    $lead = $container->get('mautic.lead.model.lead')->getEntity(7244);
    $email = $model->getEntity(72);
    $email->setIsPublished(true); // In-memory plus rollback-only transaction, never public.
    $stale = $lead->getProfileFields();
    $result = $model->sendEmail($email, $stale, ['email_type'=>MailHelper::EMAIL_TYPE_MARKETING,'ignoreDNC'=>false,'return_errors'=>true]);
    if (!$observed) echo 'Native result: '.json_encode($result).' fields: '.json_encode(array_keys($stale)).PHP_EOL;
    if ($observed !== [false]) throw new RuntimeException('Eligible fixture did not reach guard as eligible: '.json_encode($observed));
    echo "PASS eligible native EmailModel send, SMTP intercepted\n";

    $transport = new class { public int $calls=0; public function __invoke($message): void { ++$this->calls; } };
    $queuedGuard = new \MauticPlugin\ImageCrafterGuardBundle\QueuedSendGuard($transport, $container->get('imagecrafter.send_guard'));
    $mime = (new \Symfony\Component\Mime\Email())->from('support@imagecrafter.app')->to('ic-qa-rollback@example.org')->text('Rollback-only queue test');
    $mime->getHeaders()->addTextHeader('X-ImageCrafter-Email','72');
    $mime->getHeaders()->addTextHeader('X-ImageCrafter-Contact','7244');
    $queued = unserialize(serialize(new \Symfony\Component\Mailer\Messenger\SendEmailMessage($mime)));
    $queuedGuard($queued);
    if ($transport->calls !== 1) throw new RuntimeException('Eligible serialized SMTP queue was suppressed');

    $db->update('leads',['ic_stage'=>'buyer','ic_source'=>'purchase','ic_purchased_at'=>gmdate('Y-m-d H:i:s')],['id'=>7244]);
    $queuedGuard($queued);
    if ($transport->calls !== 1) throw new RuntimeException('Serialized SMTP queue bypassed purchase check');
    echo "PASS rendered SMTP queue rechecks purchase before invoking transport\n";
    $observed=[];
    $model->sendEmail($email, $stale, ['email_type'=>MailHelper::EMAIL_TYPE_MARKETING,'ignoreDNC'=>false]);
    if ($observed !== [true]) throw new RuntimeException('Stale failed-action retry was not suppressed: '.json_encode($observed));
    echo "PASS failed-action delivery using stale preview snapshot suppressed after purchase\n";

    $observed=[];
    $message = new MessageQueue();
    $message->setLead($lead);
    $message->setChannel('email');
    $message->setChannelId(72);
    (new MessageQueueSubscriber($model))->onProcessMessageQueueBatch(new MessageQueueBatchProcessEvent([$message],'email',72));
    if ($observed !== [true]) throw new RuntimeException('Frequency-deferred native queue send was not suppressed: '.json_encode($observed));
    echo "PASS native frequency-deferred queue suppressed after purchase\n";
    $db->update('leads',['ic_stage'=>'previewer','ic_source'=>'preview','ic_purchased_at'=>null,'ic_marketing_ok'=>0],['id'=>7244]);
    $queuedGuard($queued);
    if ($transport->calls !== 1) throw new RuntimeException('Serialized SMTP queue bypassed consent check');
    $observed=[];
    $message = new MessageQueue(); $message->setLead($lead); $message->setChannel('email'); $message->setChannelId(72);
    (new MessageQueueSubscriber($model))->onProcessMessageQueueBatch(new MessageQueueBatchProcessEvent([$message],'email',72));
    if ($observed !== [true]) throw new RuntimeException('Deferred consent withdrawal not suppressed');
    echo "PASS native deferred queue rechecks withdrawn consent\n";

    $dncColumns = $db->fetchFirstColumn("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_donotcontact'");
    foreach (['lead_id','date_added','reason','channel'] as $field) if (!in_array($field,$dncColumns,true)) throw new RuntimeException('DNC schema mismatch');
    $db->update('leads',['ic_marketing_ok'=>1],['id'=>7244]);
    $db->insert('lead_donotcontact',['lead_id'=>7244,'date_added'=>gmdate('Y-m-d H:i:s'),'reason'=>1,'channel'=>'email']);
    $queuedGuard($queued);
    if ($transport->calls !== 1) throw new RuntimeException('Serialized SMTP queue bypassed DNC check');
    $other = (new \Symfony\Component\Mime\Email())->from('support@imagecrafter.app')->to('ic-qa-rollback@example.org')->text('Unrelated message');
    $queuedGuard(new \Symfony\Component\Mailer\Messenger\SendEmailMessage($other));
    if ($transport->calls !== 2) throw new RuntimeException('Guard affected an unrelated message');
    echo "PASS rendered SMTP queue respects consent/DNC and leaves unrelated mail untouched\n";
    $observed=[];
    $message = new MessageQueue(); $message->setLead($lead); $message->setChannel('email'); $message->setChannelId(72);
    (new MessageQueueSubscriber($model))->onProcessMessageQueueBatch(new MessageQueueBatchProcessEvent([$message],'email',72));
    if ($observed && $observed !== [true]) throw new RuntimeException('Deferred unsubscribe not suppressed');
    echo "PASS native deferred queue respects unsubscribe\n";
    if (!$db->isTransactionActive()) throw new RuntimeException('QA transaction unexpectedly closed');
} finally {
    if ($db->isTransactionActive()) $db->rollBack();
}
echo "PASS rollback complete; no mail transported and no synthetic customer state retained\n";
