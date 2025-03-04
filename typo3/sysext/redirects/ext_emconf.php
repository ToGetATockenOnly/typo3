<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'TYPO3 CMS Redirects',
    'description' => 'Create manual redirects, list existing redirects and automatically create redirects on slug changes.',
    'category' => 'fe',
    'author' => 'TYPO3 Core Team',
    'author_email' => 'typo3cms@typo3.org',
    'author_company' => '',
    'state' => 'stable',
    'version' => '12.0.0',
    'constraints' => [
        'depends' => [
            'typo3' => '12.0.0',
        ],
        'conflicts' => [],
        'suggests' => [
            'reports' => '',
            'scheduler' => '',
        ],
    ],
];
