<?php

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

namespace TYPO3\CMS\Core\Localization;

use TYPO3\CMS\Core\Cache\Frontend\FrontendInterface;
use TYPO3\CMS\Core\Utility\ArrayUtility;
use TYPO3\CMS\Core\Utility\PathUtility;

/**
 * Main API to fetch labels from XLF (label files) based on the current system
 * language of TYPO3. It is able to resolve references to files + their pointers to the
 * proper language. If you see something about "LLL", this class does the trick for you. It
 * is not related for language handling of content, but rather of labels for plugins.
 *
 * Usually this is injected into $GLOBALS['LANG'] when in backend or CLI context, and
 * populated by the current backend user. Don't rely on $GLOBAL['LANG'] in frontend, as it is only
 * available in certain circumstances!
 * In Frontend, this is also used to translate "labels", see TypoScriptFrontendController->sL()
 * for that.
 *
 * As TYPO3 internally does not match the proper ISO locale standard, the "locale" here
 * is actually a list of supported language keys, (see Locales class), whereas "english"
 * has the language key "default".
 */
class LanguageService
{
    /**
     * This is set to the language that is currently running for the user
     *
     * @var string
     */
    public $lang = 'default';

    /**
     * If TRUE, will show the key/location of labels in the backend.
     *
     * @var bool
     */
    public $debugKey = false;

    /**
     * List of language dependencies for actual language. This is used for local variants of a language
     * that depend on their "main" language, like Brazilian Portuguese or Canadian French.
     *
     * @var array
     */
    protected $languageDependencies = [];

    /**
     * @var string[][]
     */
    protected $labels = [];

    protected Locales $locales;
    protected LocalizationFactory $localizationFactory;
    protected FrontendInterface $runtimeCache;

    /**
     * @internal use one of the factory methods instead
     */
    public function __construct(Locales $locales, LocalizationFactory $localizationFactory, FrontendInterface $runtimeCache)
    {
        $this->locales = $locales;
        $this->localizationFactory = $localizationFactory;
        $this->runtimeCache = $runtimeCache;
        $this->debugKey = (bool)$GLOBALS['TYPO3_CONF_VARS']['BE']['languageDebug'];
    }

    /**
     * Initializes the language to fetch XLF labels for.
     * $languageService = GeneralUtility::makeInstance(LanguageServiceFactory::class)->createFromUserPreferences($GLOBALS['BE_USER']);
     *
     * @throws \RuntimeException
     * @param string $languageKey The language key (two character string from backend users profile)
     * @internal use one of the factory methods instead
     */
    public function init($languageKey)
    {
        // Find the requested language in this list based on the $languageKey
        // Language is found. Configure it:
        if (in_array($languageKey, $this->locales->getLocales(), true)) {
            // The current language key
            $this->lang = $languageKey;
            $this->languageDependencies[] = $languageKey;
            foreach ($this->locales->getLocaleDependencies($languageKey) as $language) {
                $this->languageDependencies[] = $language;
            }
        }
    }

    /**
     * Debugs localization key.
     *
     * @param string $value value to debug
     * @return string
     */
    protected function debugLL($value)
    {
        return $this->debugKey ? '[' . $value . ']' : '';
    }

    /**
     * Returns the label with key $index from the globally loaded $LOCAL_LANG array.
     * Mostly used from modules with only one LOCAL_LANG file loaded into the global space.
     *
     * @param string $index Label key
     * @return string
     */
    public function getLL($index)
    {
        return $this->getLLL($index, $this->labels);
    }

    /**
     * Returns the label with key $index from the $LOCAL_LANG array used as the second argument
     *
     * @param string $index Label key
     * @param array $localLanguage $LOCAL_LANG array to get label key from
     * @return string
     */
    protected function getLLL($index, $localLanguage)
    {
        // Get Local Language. Special handling for all extensions that
        // read PHP LL files and pass arrays here directly.
        if (isset($localLanguage[$this->lang][$index])) {
            $value = is_string($localLanguage[$this->lang][$index])
                ? $localLanguage[$this->lang][$index]
                : $localLanguage[$this->lang][$index][0]['target'];
        } elseif (isset($localLanguage['default'][$index])) {
            $value = is_string($localLanguage['default'][$index])
                ? $localLanguage['default'][$index]
                : $localLanguage['default'][$index][0]['target'];
        } else {
            $value = '';
        }
        return $value . $this->debugLL($index);
    }

    /**
     * Main and most often used method.
     *
     * Resolve strings like these:
     *      'LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:labels.depth_0'
     * This looks up the given .xlf file path in the 'core' extension for label 'labels.depth_0'
     *
     * @param string $input Label key/reference
     * @return string
     */
    public function sL($input): string
    {
        $input = (string)$input;
        // early return for empty input to avoid cache and language file reading on first hit.
        if ($input === '') {
            return $input;
        }
        // Use a constant non-localizable label
        if (!str_starts_with(trim($input), 'LLL:')) {
            return $input;
        }

        $cacheIdentifier = 'labels_' . $this->lang . '_' . md5($input . '_' . (int)$this->debugKey);
        $cacheEntry = $this->runtimeCache->get($cacheIdentifier);
        if ($cacheEntry !== false) {
            return $cacheEntry;
        }
        // Remove the LLL: prefix
        $restStr = substr(trim($input), 4);
        $extensionPrefix = '';
        // ll-file referred to is found in an extension
        if (PathUtility::isExtensionPath(trim($restStr))) {
            $restStr = substr(trim($restStr), 4);
            $extensionPrefix = 'EXT:';
        }
        $parts = explode(':', trim($restStr));
        $parts[0] = $extensionPrefix . $parts[0];
        $output = $this->getLLL($parts[1] ?? '', $this->readLLfile($parts[0]));
        $output .= $this->debugLL($input);
        $this->runtimeCache->set($cacheIdentifier, $output);
        return $output;
    }

    /**
     * Includes locallang file (and possibly additional localized version if configured for)
     * Read language labels will be merged with $LOCAL_LANG (if $setGlobal = TRUE).
     *
     * @param string $fileRef $fileRef is a file-reference
     * @return array returns the loaded label file
     */
    public function includeLLFile($fileRef)
    {
        $localLanguage = $this->readLLfile($fileRef);
        if (!empty($localLanguage)) {
            $this->labels = array_replace_recursive($this->labels, $localLanguage);
        }
        return $localLanguage;
    }

    /**
     * Includes a locallang file (and possibly additional localized version if configured for),
     * and then puts everything into "default", so "default" is kept as fallback
     *
     * @param string $fileRef $fileRef is a file-reference
     * @return array
     */
    protected function includeLanguageFileRaw($fileRef)
    {
        $labels = $this->readLLfile($fileRef);
        if (!empty($labels)) {
            // Merge local onto default
            if ($this->lang !== 'default' && is_array($labels[$this->lang]) && is_array($labels['default'])) {
                // array_merge can be used so far the keys are not
                // numeric - which we assume they are not...
                $labels['default'] = array_merge($labels['default'], $labels[$this->lang]);
                unset($labels[$this->lang]);
            }
        }
        return is_array($labels) ? $labels : [];
    }

    /**
     * Includes a locallang file and returns the $LOCAL_LANG array found inside.
     *
     * @param string $fileRef Input is a file-reference to be a 'local_lang' file containing a $LOCAL_LANG array
     * @return array value of $LOCAL_LANG found in the included file, empty if non found
     */
    protected function readLLfile($fileRef): array
    {
        $cacheIdentifier = 'labels_file_' . md5($fileRef . $this->lang);
        $cacheEntry = $this->runtimeCache->get($cacheIdentifier);
        if (is_array($cacheEntry)) {
            return $cacheEntry;
        }

        if ($this->lang !== 'default') {
            $languages = array_reverse($this->languageDependencies);
        } else {
            $languages = ['default'];
        }
        $localLanguage = [];
        foreach ($languages as $language) {
            $tempLL = $this->localizationFactory->getParsedData($fileRef, $language);
            $localLanguage['default'] = $tempLL['default'];
            if (!isset($localLanguage[$this->lang])) {
                $localLanguage[$this->lang] = $localLanguage['default'];
            }
            if ($this->lang !== 'default' && isset($tempLL[$language])) {
                // Merge current language labels onto labels from previous language
                // This way we have a labels with fall back applied
                ArrayUtility::mergeRecursiveWithOverrule($localLanguage[$this->lang], $tempLL[$language], true, false);
            }
        }

        $this->runtimeCache->set($cacheIdentifier, $localLanguage);
        return $localLanguage;
    }
}
