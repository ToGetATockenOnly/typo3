<?php

declare(strict_types=1);

/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

namespace TYPO3\CMS\Workspaces\Hook;

use TYPO3\CMS\Backend\Routing\Event\BeforePagePreviewUriGeneratedEvent;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Messaging\FlashMessage;
use TYPO3\CMS\Core\Messaging\FlashMessageService;
use TYPO3\CMS\Core\Type\ContextualFeedbackSeverity;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Workspaces\Preview\PreviewUriBuilder;
use TYPO3\CMS\Workspaces\Service\StagesService;

/**
 * @internal This is a specific hook implementation and is not considered part of the Public TYPO3 API.
 */
class BackendUtilityHook
{
    /**
     * Hooks into the PagePreviewUri and redirects to the workspace preview
     * only if we're in a workspace and if the frontend-preview is disabled.
     */
    public function createPageUriForWorkspaceVersion(BeforePagePreviewUriGeneratedEvent $event): void
    {
        if ($GLOBALS['BE_USER']->workspace === 0) {
            return;
        }
        $uri = GeneralUtility::makeInstance(PreviewUriBuilder::class)
            ->buildUriForWorkspaceSplitPreview($event->getPageId());
        $queryString = $uri->getQuery();
        if ($event->getAdditionalQueryParameters() !== []) {
            $queryString .= http_build_query($event->getAdditionalQueryParameters(), '', '&', PHP_QUERY_RFC3986);
            if ($event->getLanguageId() > 0) {
                $queryString .= '&_language=' . $event->getLanguageId();
            }
            $uri = $uri->withQuery($queryString);
        }
        $event->setPreviewUri($uri);
    }

    /**
     * Use that hook to show an info message in case someone starts editing
     * a staged element
     *
     * @param array $params
     * @return bool
     */
    public function makeEditForm_accessCheck($params)
    {
        if ($GLOBALS['BE_USER']->workspace !== 0 && BackendUtility::isTableWorkspaceEnabled($params['table'])) {
            $record = BackendUtility::getRecordWSOL($params['table'], $params['uid']);
            if (isset($record['t3ver_stage']) && abs($record['t3ver_stage']) > StagesService::STAGE_EDIT_ID) {
                $stages = GeneralUtility::makeInstance(StagesService::class);
                $stageName = $stages->getStageTitle($record['t3ver_stage']);
                $editingName = $stages->getStageTitle(StagesService::STAGE_EDIT_ID);
                $message = $this->getLanguageService()->sL('LLL:EXT:workspaces/Resources/Private/Language/locallang.xlf:info.elementAlreadyModified');

                $flashMessage = GeneralUtility::makeInstance(FlashMessage::class, sprintf($message, $stageName, $editingName), '', ContextualFeedbackSeverity::INFO, true);

                $flashMessageService = GeneralUtility::makeInstance(FlashMessageService::class);
                $defaultFlashMessageQueue = $flashMessageService->getMessageQueueByIdentifier();
                $defaultFlashMessageQueue->enqueue($flashMessage);
            }
        }
        return $params['hasAccess'];
    }

    protected function getLanguageService(): ?LanguageService
    {
        return $GLOBALS['LANG'] ?? null;
    }
}
