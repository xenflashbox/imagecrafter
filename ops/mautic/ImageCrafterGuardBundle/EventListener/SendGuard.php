<?php
namespace MauticPlugin\ImageCrafterGuardBundle\EventListener;

use Doctrine\DBAL\Connection;
use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event\EmailSendEvent;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class SendGuard implements EventSubscriberInterface
{
    public function __construct(private Connection $db, private LoggerInterface $logger) {}

    public static function getSubscribedEvents(): array
    {
        return [EmailEvents::EMAIL_PRE_SEND => ['check', -1024]];
    }

    public static function eligible(int $emailId, array $contact, array $tags, bool $dnc, int $now): bool
    {
        if (!in_array($emailId, [70, 71, 72, 73, 74, 75], true)) return true;
        if ($dnc || !in_array($contact['ic_marketing_ok'] ?? null, [true, 1, '1'], true)) return false;
        if (array_intersect(['test', 'internal-test', 'integration_test'], $tags)) return false;
        $address = strtolower($contact['email'] ?? '');
        if (preg_match('/(@xencolabs\.com$|@compareitad\.com$|^xenophon@gmail\.com$|^xen58@yahoo\.com$|\.invalid$|\.test$)/', $address)) return false;
        $captured = strtotime(($contact['ic_captured_at'] ?? '').' UTC');
        $consent = strtotime(($contact['ic_consent_at'] ?? '').' UTC');
        $launch = strtotime('2026-09-22 00:00:00 UTC');
        if (!$captured || !$consent || $captured < $launch || $consent < $launch || $captured > $now || $consent > $now) return false;
        if (in_array($emailId, [72, 74, 75], true)) {
            $url = $contact['ic_return_url'] ?? '';
            $expires = strtotime(($contact['ic_return_expires_at'] ?? '').' UTC');
            return ($contact['ic_stage'] ?? '') === 'previewer'
                && ($contact['ic_source'] ?? '') === 'preview'
                && empty($contact['ic_purchased_at'])
                && $expires > $now
                && str_starts_with($url, 'https://imagecrafter.app/api/portraits/return#id=')
                && preg_match('/&token=[a-f0-9]{64}$/', $url) === 1;
        }
        if (($contact['ic_stage'] ?? '') !== 'buyer' || ($contact['ic_source'] ?? '') !== 'purchase' || empty($contact['ic_purchased_at'])) return false;
        if (in_array($emailId, [70, 73], true) && ($contact['ic_purchase_type'] ?? '') !== 'single') return false;
        if ($emailId === 73 && !in_array('ic-pack-verified', $tags, true)) return false;
        return true;
    }

    public function check(EmailSendEvent $event): void
    {
        $id = (int) ($event->getEmail()?->getId() ?? 0);
        if (!in_array($id, [70, 71, 72, 73, 74, 75], true)) return;
        $lead = $event->getLead();
        $leadId = is_array($lead) ? ($lead['id'] ?? 0) : ($lead?->getId() ?? 0);
        $event->addTextHeader('X-ImageCrafter-Email', (string) $id);
        $event->addTextHeader('X-ImageCrafter-Contact', (string) $leadId);
        if (!$this->allowsCurrent($id, (int) $leadId)) {
            $event->enableSkip();
        }
    }

    public function allowsCurrent(int $id, int $leadId): bool
    {
        if (!in_array($id, [70, 71, 72, 73, 74, 75], true)) return true;
        try {
            // Read current DB state, not the contact snapshot stored in a deferred queue.
            $contact = $this->db->fetchAssociative('SELECT email, ic_stage, ic_source, ic_purchase_type, ic_purchased_at, ic_marketing_ok, ic_captured_at, ic_consent_at, ic_return_url, ic_return_expires_at FROM '.MAUTIC_TABLE_PREFIX.'leads WHERE id = ?', [$leadId]);
            $tags = $this->db->fetchFirstColumn('SELECT t.tag FROM '.MAUTIC_TABLE_PREFIX.'lead_tags t JOIN '.MAUTIC_TABLE_PREFIX.'lead_tags_xref x ON x.tag_id=t.id WHERE x.lead_id=?', [$leadId]);
            $dnc = (bool) $this->db->fetchOne('SELECT COUNT(*) FROM '.MAUTIC_TABLE_PREFIX.'lead_donotcontact WHERE lead_id=? AND channel=?', [$leadId, 'email']);
            $allowed = $contact && self::eligible($id, $contact, $tags, $dnc, time());
        } catch (\Throwable $error) {
            $allowed = false;
            $this->logger->error('IC send guard failed closed', ['emailId' => $id, 'leadId' => $leadId, 'errorClass' => get_class($error)]);
        }
        if (!$allowed) {
            $this->logger->notice('IC send suppressed at transport boundary', ['emailId' => $id, 'leadId' => $leadId]);
        }
        return (bool) $allowed;
    }
}
