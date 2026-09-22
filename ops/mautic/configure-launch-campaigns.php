<?php
require '/var/www/html/vendor/autoload.php';
require '/var/www/html/docroot/app/console-application.php';
$kernel->boot();
$container=$kernel->getContainer();
$em=$container->get('doctrine.orm.entity_manager');
$publish=in_array('--publish',$_SERVER['argv'],true);
$db=$container->get('doctrine.dbal.default_connection');
$db->beginTransaction();
try {
    foreach ([19=>48,20=>49,21=>50] as $id=>$segmentId) {
        $campaign=$em->getRepository(\Mautic\CampaignBundle\Entity\Campaign::class)->find($id);
        $segment=$em->getRepository(\Mautic\LeadBundle\Entity\LeadList::class)->find($segmentId);
        if (!$campaign || !$segment || !str_starts_with($segment->getAlias(),'ic-launch-')) throw new RuntimeException('Launch identity mismatch');
        foreach ($campaign->getLists()->toArray() as $old) $campaign->removeList($old);
        $campaign->addList($segment);
        foreach ($campaign->getEvents() as $event) {
            $tags=$event->getProperties()['tags']??[];
            if ($event->getType()==='lead.tags' && $tags===['ic-launch-approved']) {
                $event->setType('lead.field_value');
                $event->setProperties(['field'=>'ic_marketing_ok','operator'=>'=','value'=>'1']);
                $event->setName(str_replace('approved cohort','confirmed marketing consent',$event->getName()));
            }
            if ($event->getType()==='lead.tags' && $tags===['ic-return-ready']) {
                $event->setType('lead.field_value');
                $event->setProperties(['field'=>'ic_return_url','operator'=>'!empty','value'=>'']);
                $event->setName('Verified private return link present');
            }
            $em->persist($event);
        }
        $campaign->setAllowRestart(false);
        $campaign->setIsPublished($publish);
        $em->persist($campaign);
        echo 'Campaign '.$id.' source '.$segmentId.' published='.($publish?'yes':'no').PHP_EOL;
    }
    foreach ([70,71,72,74,75] as $id) {
        $email=$em->getRepository(\Mautic\EmailBundle\Entity\Email::class)->find($id);
        $email->setIsPublished($publish);
        $em->persist($email);
    }
    $pack = $em->getRepository(\Mautic\EmailBundle\Entity\Email::class)->find(73);
    $pack->setIsPublished(false);
    $em->persist($pack);
    $em->flush(); $db->commit();
    $em->clear();
    foreach ([19=>48,20=>49,21=>50] as $id=>$segmentId) {
        $saved=$em->find(\Mautic\CampaignBundle\Entity\Campaign::class,$id);
        $ids=array_map(fn($list)=>(int)$list->getId(),$saved->getLists()->toArray());
        if (array_values($ids)!==[$segmentId] || (bool)$saved->getIsPublished()!==$publish) throw new RuntimeException('Campaign readback mismatch '.$id);
    }
} catch (\Throwable $e) { if($db->isTransactionActive())$db->rollBack(); throw $e; }
echo "Pack promotion 73 remains unpublished and gated; no tags assigned.\n";
