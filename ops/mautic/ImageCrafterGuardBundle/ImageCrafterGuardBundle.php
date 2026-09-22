<?php
namespace MauticPlugin\ImageCrafterGuardBundle;
use Mautic\PluginBundle\Bundle\PluginBundleBase;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
class ImageCrafterGuardBundle extends PluginBundleBase
{
    public function build(ContainerBuilder $container): void
    {
        parent::build($container);
        $container->register('imagecrafter.queued_send_guard', QueuedSendGuard::class)
            ->setDecoratedService('mailer.messenger.message_handler')
            ->setArguments([new Reference('imagecrafter.queued_send_guard.inner'), new Reference('imagecrafter.send_guard')]);
    }
}
