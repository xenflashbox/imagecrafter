<?php
namespace MauticPlugin\ImageCrafterGuardBundle;

use MauticPlugin\ImageCrafterGuardBundle\EventListener\SendGuard;
use Symfony\Component\Mailer\Messenger\SendEmailMessage;
use Symfony\Component\Mime\Message;

class QueuedSendGuard
{
    public function __construct(private object $inner, private SendGuard $guard) {}

    public function __invoke(SendEmailMessage $message): void
    {
        $email = $message->getMessage();
        if ($email instanceof Message) {
            $headers = $email->getHeaders();
            $id = (int) ($headers->get('X-ImageCrafter-Email')?->getBodyAsString() ?? 0);
            $contact = (int) ($headers->get('X-ImageCrafter-Contact')?->getBodyAsString() ?? 0);
            // A normal return acknowledges suppressed queue items without retries or SMTP.
            if (!$this->guard->allowsCurrent($id, $contact)) return;
        }
        ($this->inner)($message);
    }
}
