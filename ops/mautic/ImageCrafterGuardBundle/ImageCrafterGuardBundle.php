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
        $container->register(QueuedSendGuard::class, QueuedSendGuard::class)
            ->setDecoratedService('mailer.messenger.message_handler')
            ->setArguments([new Reference(QueuedSendGuard::class.'.inner'), new Reference('imagecrafter.send_guard')]);
    }
}
