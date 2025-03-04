.. include:: /Includes.rst.txt

=======================================================================
Breaking: #97210 - Types added to method signatures or class properties
=======================================================================

See :issue:`97210`

Description
===========

The following PHP classes have had parameter and return types added to some or
all of their method signatures. The types are consistent with existing
docblock-documented type expectations and existing behavior.

- :php:`\TYPO3\CMS\Core\Utility\ArrayUtility`
- :php:`\TYPO3\CMS\Core\Utility\ClassNamingUtility`
- :php:`\TYPO3\CMS\Core\Utility\CsvUtility`
- :php:`\TYPO3\CMS\Core\Utility\CommandUtility`
- :php:`\TYPO3\CMS\Core\Utility\DebugUtility`
- :php:`\TYPO3\CMS\Core\Utility\DiffUtility`
- :php:`\TYPO3\CMS\Core\Utility\ExtensionManagementUtility`
- :php:`\TYPO3\CMS\Core\Utility\GeneralUtility`
- :php:`\TYPO3\CMS\Core\Utility\MailUtility`
- :php:`\TYPO3\CMS\Core\Utility\MathUtility`
- :php:`\TYPO3\CMS\Core\Utility\PathUtility`
- :php:`\TYPO3\CMS\Core\Utility\RootlineUtility`
- :php:`\TYPO3\CMS\Core\Utility\StringUtility`
- :php:`\TYPO3\CMS\Core\Utility\VersionNumberUtility`

The following PHP classes have added public class property types:

- :php:`\TYPO3\CMS\Core\Utility\DiffUtility`

Impact
======

Calling any of these methods with incompatible types now throws a :php:`\TypeError`,
especially if the calling code is within :php:`declare(strict_types=1);` context.
Before the result of such method calls was undefined or inconsistent.


Affected Installations
======================

Code routines that are passing an invalid type will need to ensure they pass a correct type.

If a code file is running with :php:`declare(strict_types=1);`, that includes, for instance,
passing a numeric string to a method that expects an int or float. Those will need to be
properly cast before being passed.

The extension scanner will not find affected extensions.

Migration
=========

Any code that is already passing the expected type to these methods will be unaffected.
Code that is passing an incorrect type will need to pass the correct type, possibly
including an explicit cast.

.. index:: PHP-API, NotScanned, ext:core
