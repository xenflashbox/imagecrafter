<?php
return [
    'name' => 'ImageCrafter Send Guard',
    'description' => 'Rechecks ImageCrafter launch eligibility immediately before transport.',
    'version' => '1.0.0',
    'author' => 'Xenco Labs',
    'services' => ['events' => [
        'imagecrafter.send_guard' => [
            'class' => \MauticPlugin\ImageCrafterGuardBundle\EventListener\SendGuard::class,
            'arguments' => ['doctrine.dbal.default_connection', 'monolog.logger.mautic'],
        ],
    ]],
];
