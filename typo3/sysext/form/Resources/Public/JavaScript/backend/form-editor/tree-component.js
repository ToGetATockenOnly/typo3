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

/**
 * Module: @typo3/form/backend/form-editor/tree-component
 */
import $ from 'jquery';
import * as Helper from '@typo3/form/backend/form-editor/helper.js';
import Icons from '@typo3/backend/icons.js';
import '@typo3/form/backend/contrib/jquery.mjs.nested-sortable.js';

const {
  bootstrap,
  buildTitleByFormElement,
  getAllTreeNodes,
  getParentTreeNodeWithinDomElement,
  getParentTreeNodeIdentifierPathWithinDomElement,
  getSiblingTreeNodeIdentifierPathWithinDomElement,
  getTreeDomElement,
  getTreeNode,
  getTreeNodeWithinDomElement,
  getTreeNodeIdentifierPathWithinDomElement,
  renderCompositeFormElementChildsAsSortableList,
  renew,
  setTreeNodeTitle
} = factory($, Helper, Icons);

export {
  bootstrap,
  buildTitleByFormElement,
  getAllTreeNodes,
  getParentTreeNodeWithinDomElement,
  getParentTreeNodeIdentifierPathWithinDomElement,
  getSiblingTreeNodeIdentifierPathWithinDomElement,
  getTreeDomElement,
  getTreeNode,
  getTreeNodeWithinDomElement,
  getTreeNodeIdentifierPathWithinDomElement,
  renderCompositeFormElementChildsAsSortableList,
  renew,
  setTreeNodeTitle
};

function factory($, Helper, Icons) {

  return (function($, Helper, Icons) {

    /**
     * @private
     *
     * @var object
     */
    var _configuration = null;

    /**
     * @private
     *
     * @var object
     */
    var _expanderStates = {};

    /**
     * @private
     *
     * @var object
     */
    var _defaultConfiguration = {
      domElementClassNames: {
        collapsed: 'mjs-nestedSortable-collapsed',
        expanded: 'mjs-nestedSortable-expanded',
        hasChildren: 't3-form-element-has-children',
        sortable: 'sortable',
        svgLinkWrapper: 'svg-wrapper',
        noNesting: 'mjs-nestedSortable-no-nesting'
      },
      domElementDataAttributeNames: {
        abstractType: 'data-element-abstract-type'
      },
      domElementDataAttributeValues: {
        collapse: 'actions-pagetree-collapse',
        expander: 'treeExpander',
        title: 'treeTitle'
      },
      isSortable: true,
      svgLink: {
        height: 15,
        paths: {
          angle: 'M0 0 V20 H15',
          vertical: 'M0 0 V20 H0',
          hidden: 'M0 0 V0 H0'
        },
        width: 20
      }
    };

    /**
     * @private
     *
     * @var object
     */
    var _formEditorApp = null;

    /**
     * @private
     *
     * @var object
     */
    var _treeDomElement = null;

    /* *************************************************************
     * Private Methods
     * ************************************************************/

    /**
     * @private
     *
     * @return void
     * @throws 1478268638
     */
    function _helperSetup() {
      assert('function' === $.type(Helper.bootstrap),
        'The view model helper does not implement the method "bootstrap"',
        1478268638
      );
      Helper.bootstrap(getFormEditorApp());
    };

    /**
     * @private
     *
     * @return object
     */
    function getFormEditorApp() {
      return _formEditorApp;
    };

    /**
     * @public
     *
     * @param object
     * @return object
     */
    function getHelper(configuration) {
      if (getUtility().isUndefinedOrNull(configuration)) {
        return Helper.setConfiguration(_configuration);
      }
      return Helper.setConfiguration(configuration);
    };

    /**
     * @private
     *
     * @return object
     */
    function getUtility() {
      return getFormEditorApp().getUtility();
    };

    /**
     * @private
     *
     * @param mixed test
     * @param string message
     * @param int messageCode
     * @return void
     */
    function assert(test, message, messageCode) {
      return getFormEditorApp().assert(test, message, messageCode);
    };

    /**
     * @private
     *
     * @return object
     */
    function getRootFormElement() {
      return getFormEditorApp().getRootFormElement();
    };

    /**
     * @private
     *
     * @return object
     */
    function getCurrentlySelectedFormElement() {
      return getFormEditorApp().getCurrentlySelectedFormElement();
    };

    /**
     * @private
     *
     * @return object
     */
    function getPublisherSubscriber() {
      return getFormEditorApp().getPublisherSubscriber();
    };

    /**
     * @private
     *
     * @param object
     * @param string
     * @return mixed
     */
    function getFormElementDefinition(formElement, formElementDefinitionKey) {
      return getFormEditorApp().getFormElementDefinition(formElement, formElementDefinitionKey);
    };

    /**
     * @private
     *
     * @return object
     */
    function _getLinkSvg(type) {
      return $('<span class="' + getHelper().getDomElementClassName('svgLinkWrapper') + '">'
        + '<svg version="1.1" width="' + _configuration['svgLink']['width'] + '" height="' + _configuration['svgLink']['height'] + '">'
        + '<path class="link" d="' + _configuration['svgLink']['paths'][type] + '">'
        + '</svg>'
        + '</span>');
    };

    /**
     * @private
     *
     * @param object
     * @return object
     * @publish view/tree/render/listItemAdded
     * @throws 1478715704
     */
    function _renderNestedSortableListItem(formElement) {
      var childFormElements, childList, expanderItem, isLastFormElementWithinParentFormElement,
        listItem, listItemContent, searchElement;
      assert('object' === $.type(formElement), 'Invalid parameter "formElement"', 1478715704);

      isLastFormElementWithinParentFormElement = false;
      if (formElement.get('__identifierPath') === getFormEditorApp().getLastFormElementWithinParentFormElement(formElement).get('__identifierPath')) {
        isLastFormElementWithinParentFormElement = true;
      }

      listItem = $('<li></li>');
      if (!getFormElementDefinition(formElement, '_isCompositeFormElement')) {
        listItem.addClass(getHelper().getDomElementClassName('noNesting'));
      }

      listItemContent = $('<div></div>')
        .attr(getHelper().getDomElementDataAttribute('elementIdentifier'), formElement.get('__identifierPath'))
        .append(
          $('<span></span>')
            .attr(getHelper().getDomElementDataAttribute('identifier'), getHelper().getDomElementDataAttributeValue('title'))
            .html(buildTitleByFormElement(formElement))
        );

      if (getFormElementDefinition(formElement, '_isCompositeFormElement')) {
        listItemContent.attr(getHelper().getDomElementDataAttribute('abstractType'), 'isCompositeFormElement');
      }
      if (getFormElementDefinition(formElement, '_isTopLevelFormElement')) {
        listItemContent.attr(getHelper().getDomElementDataAttribute('abstractType'), 'isTopLevelFormElement');
      }

      expanderItem = $('<span></span>').attr('data-identifier', getHelper().getDomElementDataAttributeValue('expander'));
      listItemContent.prepend(expanderItem);

      Icons.getIcon(getFormElementDefinition(formElement, 'iconIdentifier'), Icons.sizes.small, null, Icons.states.default).then(function(icon) {
        expanderItem.after(
          $(icon).addClass(getHelper().getDomElementClassName('icon'))
            .tooltip({
              title: 'id = ' + formElement.get('identifier'),
              placement: 'right'
            })
        );

        if (getFormElementDefinition(formElement, '_isCompositeFormElement')) {
          if (formElement.get('renderables') && formElement.get('renderables').length > 0) {
            Icons.getIcon(getHelper().getDomElementDataAttributeValue('collapse'), Icons.sizes.small).then(function(icon) {
              expanderItem.before(_getLinkSvg('angle')).html($(icon));
              listItem.addClass(getHelper().getDomElementClassName('hasChildren'));
            });
          } else {
            expanderItem.before(_getLinkSvg('angle')).remove();
          }
        } else {
          listItemContent.prepend(_getLinkSvg('angle'));
          expanderItem.remove();
        }

        searchElement = formElement.get('__parentRenderable');
        while (searchElement) {
          if (searchElement.get('__identifierPath') === getRootFormElement().get('__identifierPath')) {
            break;
          }

          if (searchElement.get('__identifierPath') === getFormEditorApp().getLastFormElementWithinParentFormElement(searchElement).get('__identifierPath')) {
            listItemContent.prepend(_getLinkSvg('hidden'));
          } else {
            listItemContent.prepend(_getLinkSvg('vertical'));
          }
          searchElement = searchElement.get('__parentRenderable');
        }
      });
      listItem.append(listItemContent);

      getPublisherSubscriber().publish('view/tree/render/listItemAdded', [listItem, formElement]);
      childFormElements = formElement.get('renderables');
      childList = null;
      if ('array' === $.type(childFormElements)) {
        childList = $('<ol></ol>');
        for (var i = 0, len = childFormElements.length; i < len; ++i) {
          childList.append(_renderNestedSortableListItem(childFormElements[i]));
        }
      }

      if (childList) {
        listItem.append(childList);
      }
      return listItem;
    };

    /**
     * @private
     *
     * @return void
     * @publish view/tree/dnd/stop
     * @publish view/tree/dnd/change
     * @publish view/tree/dnd/update
     */
    function _addSortableEvents() {
      $('ol.' + getHelper().getDomElementClassName('sortable'), _treeDomElement).nestedSortable({
        forcePlaceholderSize: true,
        protectRoot: true,
        isTree: true,
        handle: 'div' + getHelper().getDomElementDataAttribute('elementIdentifier', 'bracesWithKey'),
        helper: 'clone',
        items: 'li',
        opacity: .6,
        revert: 250,
        delay: 200,
        tolerance: 'pointer',
        toleranceElement: '> div',

        isAllowed: function(placeholder, placeholderParent, currentItem) {
          var formElementIdentifierPath, formElementTypeDefinition, targetFormElementIdentifierPath,
            targetFormElementTypeDefinition;

          if (typeof placeholderParent === 'undefined') {
            return true;
          }

          formElementIdentifierPath = getTreeNodeIdentifierPathWithinDomElement($(currentItem));
          targetFormElementIdentifierPath = getTreeNodeIdentifierPathWithinDomElement($(placeholderParent));

          formElementTypeDefinition = getFormElementDefinition(formElementIdentifierPath);
          targetFormElementTypeDefinition = getFormElementDefinition(targetFormElementIdentifierPath);

          if (
            targetFormElementTypeDefinition['_isTopLevelFormElement']
            && !targetFormElementTypeDefinition['_isCompositeFormElement']
          ) {
            return false;
          }

          return true;
        },
        stop: function(e, o) {
          getPublisherSubscriber().publish('view/tree/dnd/stop', [getTreeNodeIdentifierPathWithinDomElement($(o.item))]);
        },
        change: function(e, o) {
          var enclosingCompositeFormElement, parentFormElementIdentifierPath;

          parentFormElementIdentifierPath = getParentTreeNodeIdentifierPathWithinDomElement($(o.placeholder));
          if (parentFormElementIdentifierPath) {
            enclosingCompositeFormElement = getFormEditorApp().findEnclosingCompositeFormElementWhichIsNotOnTopLevel(parentFormElementIdentifierPath);
          }
          getPublisherSubscriber().publish('view/tree/dnd/change', [$(o.placeholder), parentFormElementIdentifierPath, enclosingCompositeFormElement]);
        },
        update: function(e, o) {
          var nextFormElementIdentifierPath, movedFormElementIdentifierPath,
            previousFormElementIdentifierPath;

          movedFormElementIdentifierPath = getTreeNodeIdentifierPathWithinDomElement($(o.item));
          previousFormElementIdentifierPath = getSiblingTreeNodeIdentifierPathWithinDomElement($(o.item), 'prev');
          nextFormElementIdentifierPath = getSiblingTreeNodeIdentifierPathWithinDomElement($(o.item), 'next');

          getPublisherSubscriber().publish('view/tree/dnd/update', [$(o.item), movedFormElementIdentifierPath, previousFormElementIdentifierPath, nextFormElementIdentifierPath]);
        }
      });
    };

    /**
     * @private
     *
     * @return void
     */
    function _saveExpanderStates() {
      var addStates;

      addStates = function(formElement) {
        var childFormElements, treeNode;

        if (getFormElementDefinition(formElement, '_isCompositeFormElement')) {
          treeNode = getTreeNode(formElement);
          if (treeNode.length) {
            if (treeNode.closest('li').hasClass(getHelper().getDomElementClassName('expanded'))) {
              _expanderStates[formElement.get('__identifierPath')] = true;
            } else {
              _expanderStates[formElement.get('__identifierPath')] = false;
            }
          }

          if (getUtility().isUndefinedOrNull(_expanderStates[formElement.get('__identifierPath')])) {
            _expanderStates[formElement.get('__identifierPath')] = true;
          }
        }

        childFormElements = formElement.get('renderables');
        if ('array' === $.type(childFormElements)) {
          for (var i = 0, len = childFormElements.length; i < len; ++i) {
            addStates(childFormElements[i]);
          }
        }
      };
      addStates(getRootFormElement());

      for (var identifierPath in _expanderStates) {
        if (!_expanderStates.hasOwnProperty(identifierPath)) {
          continue;
        }
        try {
          getFormEditorApp().getFormElementByIdentifierPath(identifierPath);
        } catch (error) {
          delete _expanderStates[identifierPath];
        }
      }
    };

    /**
     * @private
     *
     * @return void
     */
    function _loadExpanderStates() {
      for (var identifierPath in _expanderStates) {
        var treeNode;

        if (!_expanderStates.hasOwnProperty(identifierPath)) {
          continue;
        }
        treeNode = getTreeNode(identifierPath);
        if (treeNode.length) {
          if (_expanderStates[identifierPath]) {
            treeNode.closest('li')
              .removeClass(getHelper().getDomElementClassName('collapsed'))
              .addClass(getHelper().getDomElementClassName('expanded'));
          } else {
            treeNode.closest('li')
              .addClass(getHelper().getDomElementClassName('collapsed'))
              .removeClass(getHelper().getDomElementClassName('expanded'));
          }
        }
      }
    };

    /* *************************************************************
     * Public Methods
     * ************************************************************/

    /**
     * @public
     *
     * @param object
     * @return object
     * @throws 1478721208
     */
    function renderCompositeFormElementChildsAsSortableList(formElement) {
      var elementList;
      assert('object' === $.type(formElement), 'Invalid parameter "formElement"', 1478721208);

      elementList = $('<ol></ol>').addClass(getHelper().getDomElementClassName('sortable'));
      if ('array' === $.type(formElement.get('renderables'))) {
        for (var i = 0, len = formElement.get('renderables').length; i < len; ++i) {
          elementList.append(_renderNestedSortableListItem(formElement.get('renderables')[i]));
        }
      }
      return elementList;
    };

    /**
     * @public
     *
     * @return void
     * @param object
     * @publish view/tree/node/clicked
     */
    function renew(formElement) {
      if (getFormEditorApp().getUtility().isUndefinedOrNull(formElement)) {
        formElement = getRootFormElement();
      }
      _saveExpanderStates();
      _treeDomElement.off().empty().append(renderCompositeFormElementChildsAsSortableList(formElement));

      // We make use of the same strategy for db click detection as the current core pagetree implementation.
      // @see https://github.com/typo3/typo3/blob/260226e93c651356545e91a7c55ee63e186766d5/typo3/sysext/backend/Resources/Public/JavaScript/PageTree/PageTree.js#L350
      var clicks = 0;
      _treeDomElement.on("click", function(e) {
        var formElementIdentifierPath;

        formElementIdentifierPath = $(e.target)
          .closest(getHelper().getDomElementDataAttribute('elementIdentifier', 'bracesWithKey'))
          .attr(getHelper().getDomElementDataAttribute('elementIdentifier'));
        if (getUtility().isUndefinedOrNull(formElementIdentifierPath) || !getUtility().isNonEmptyString(formElementIdentifierPath)) {
          return;
        }

        clicks++;

        if (clicks === 1) {
          setTimeout(function() {
            if (clicks === 1) {
              getPublisherSubscriber().publish('view/tree/node/clicked', [formElementIdentifierPath]);
            } else {
              _editTreeNodeLabel(formElementIdentifierPath);
            }
            clicks = 0;
          }, 300);
        }
      });

      $(getHelper().getDomElementDataIdentifierSelector('expander'), _treeDomElement).on('click', function() {
        $(this).closest('li').toggleClass(getHelper().getDomElementClassName('collapsed')).toggleClass(getHelper().getDomElementClassName('expanded'));
      });

      if (_configuration['isSortable']) {
        _addSortableEvents();
      }
      _loadExpanderStates();
    };

    /**
     * @public
     *
     * @param object
     * @return string
     */
    function getAllTreeNodes() {
      return $(getHelper().getDomElementDataAttribute('elementIdentifier', 'bracesWithKey'), _treeDomElement);
    };

    /**
     * @public
     *
     * @param object
     * @return string
     */
    function getTreeNodeWithinDomElement(element) {
      return $(element).find(getHelper().getDomElementDataAttribute('elementIdentifier', 'bracesWithKey')).first();
    };

    /**
     * @public
     *
     * @param object
     * @return string
     */
    function getTreeNodeIdentifierPathWithinDomElement(element) {
      return getTreeNodeWithinDomElement($(element)).attr(getHelper().getDomElementDataAttribute('elementIdentifier'));
    };

    /**
     * @public
     *
     * @param object
     * @return string
     */
    function getParentTreeNodeWithinDomElement(element) {
      return $(element).parent().closest('li').find(getHelper().getDomElementDataAttribute('elementIdentifier', 'bracesWithKey')).first();
    };

    /**
     * @public
     *
     * @param object
     * @return string
     */
    function getParentTreeNodeIdentifierPathWithinDomElement(element) {
      return getParentTreeNodeWithinDomElement(element).attr(getHelper().getDomElementDataAttribute('elementIdentifier'));
    };

    /**
     * @private
     *
     * @param object
     * @param string
     * @return string
     */
    function getSiblingTreeNodeIdentifierPathWithinDomElement(element, position) {
      var formElementIdentifierPath;

      if (getUtility().isUndefinedOrNull(position)) {
        position = 'prev';
      }
      formElementIdentifierPath = getTreeNodeIdentifierPathWithinDomElement(element);
      element = (position === 'prev') ? $(element).prev('li') : $(element).next('li');
      return element.find(getHelper().getDomElementDataAttribute('elementIdentifier', 'bracesWithKey'))
        .not(getHelper().getDomElementDataAttribute('elementIdentifier', 'bracesWithKeyValue', [formElementIdentifierPath]))
        .first()
        .attr(getHelper().getDomElementDataAttribute('elementIdentifier'));
    };

    /**
     * @public
     *
     * @param string
     * @param object
     * @return void
     */
    function setTreeNodeTitle(title, formElement) {
      if (getUtility().isUndefinedOrNull(title)) {
        title = buildTitleByFormElement(formElement);
      }

      $(getHelper().getDomElementDataIdentifierSelector('title'), getTreeNode(formElement)).html(title);
    };

    /**
     * @public
     *
     * @param string|object
     * @return object
     */
    function getTreeNode(formElement) {
      var formElementIdentifierPath;

      if ('string' === $.type(formElement)) {
        formElementIdentifierPath = formElement;
      } else {
        if (getUtility().isUndefinedOrNull(formElement)) {
          formElementIdentifierPath = getCurrentlySelectedFormElement().get('__identifierPath');
        } else {
          formElementIdentifierPath = formElement.get('__identifierPath');
        }
      }
      return $(getHelper().getDomElementDataAttribute('elementIdentifier', 'bracesWithKeyValue', [formElementIdentifierPath]), _treeDomElement);
    };

    /**
     * @public
     *
     * @param object
     * @return object
     * @throws 1478719287
     */
    function buildTitleByFormElement(formElement) {
      if (getUtility().isUndefinedOrNull(formElement)) {
        formElement = getCurrentlySelectedFormElement();
      }
      assert('object' === $.type(formElement), 'Invalid parameter "formElement"', 1478719287);

      return $('<span></span>')
        .text((formElement.get('label') ? formElement.get('label') : formElement.get('identifier')))
        .append($('<small></small>').text("(" + getFormElementDefinition(formElement, 'label') + ")"));
    };

    /**
     * @public
     *
     * @return object
     */
    function getTreeDomElement() {
      return _treeDomElement;
    };

    /**
     * @private
     *
     * @param string
     */
    function _editTreeNodeLabel(formElementIdentifierPath) {
      var treeNode = getTreeNode(formElementIdentifierPath);
      var titleNode = $(getHelper().getDomElementDataIdentifierSelector('title'), treeNode);
      var currentTitle = titleNode.children()[0].childNodes[0].nodeValue.trim();
      var treeRootWidth = getTreeDomElement().width();
      var nodeIsEdit = true;

      var input = $('<input>')
        .attr('class', 'node-edit')
        .css('top', function() {
          var top = titleNode.position().top;
          return top + 'px';
        })
        .css('left', titleNode.position().left + 'px')
        .css('width', treeRootWidth - titleNode.position().left + 'px')
        .attr('type', 'text')
        .attr('value', currentTitle)
        .on('click', function(e) {
          e.stopPropagation();
        })
        .on('keyup', function(e) {
          if (e.keyCode === 13 || e.keyCode === 9) { //enter || tab
            var newTitle = this.value.trim();

            if (getUtility().isNonEmptyString(newTitle) && (newTitle !== currentTitle)) {
              nodeIsEdit = false;
              input.remove();
              getPublisherSubscriber().publish('view/tree/node/changed', [formElementIdentifierPath, newTitle]);
            } else {
              nodeIsEdit = false;
              input.remove();
            }
          } else if (e.keyCode === 27) { //esc
            nodeIsEdit = false;
            input.remove();
          }
        })
        .on('blur', function() {
          if(nodeIsEdit) {
            var newTitle = this.value.trim();
            input.remove();
            if(getUtility().isNonEmptyString(newTitle) && newTitle !== currentTitle) {
              getPublisherSubscriber().publish('view/tree/node/changed', [formElementIdentifierPath, newTitle]);
            }
          }
        });

      treeNode.append(input);
      input.focus();
    };

    /**
     * @public
     *
     * @param object
     * @param object
     * @param object
     * @return this
     * @throws 1478714814
     */
    function bootstrap(formEditorApp, appendToDomElement, configuration) {
      _formEditorApp = formEditorApp;
      assert('object' === $.type(appendToDomElement), 'Invalid parameter "appendToDomElement"', 1478714814);

      _treeDomElement = $(appendToDomElement);
      _configuration = $.extend(true, _defaultConfiguration, configuration || {});
      _helperSetup();
      return this;
    };

    /**
     * Publish the public methods.
     * Implements the "Revealing Module Pattern".
     */
    return {
      bootstrap: bootstrap,
      buildTitleByFormElement: buildTitleByFormElement,
      getAllTreeNodes: getAllTreeNodes,
      getParentTreeNodeWithinDomElement: getParentTreeNodeWithinDomElement,
      getParentTreeNodeIdentifierPathWithinDomElement: getParentTreeNodeIdentifierPathWithinDomElement,
      getSiblingTreeNodeIdentifierPathWithinDomElement: getSiblingTreeNodeIdentifierPathWithinDomElement,
      getTreeDomElement: getTreeDomElement,
      getTreeNode: getTreeNode,
      getTreeNodeWithinDomElement: getTreeNodeWithinDomElement,
      getTreeNodeIdentifierPathWithinDomElement: getTreeNodeIdentifierPathWithinDomElement,
      renderCompositeFormElementChildsAsSortableList: renderCompositeFormElementChildsAsSortableList,
      renew: renew,
      setTreeNodeTitle: setTreeNodeTitle
    };
  })($, Helper, Icons);
}
