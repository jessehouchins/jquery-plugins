(function($){

  /**
   * Selectable makes a group of items selectable using standard keyboard controls
   * for selecting ranges and adding/removing items from the selection.
   *
   * 'SHIFT + click'      Adds or removes all items betwen the clicked element
   *                      and the last-clicked element to the selection
   *
   * 'Ctrl/Cmd + click'   Adds or removes a single item from the selection
   *
   *
   * @method  constructor (#el.selectable())
   * @param   {string}    selector,   jQuery selector for elements to be selected (auto scoped to the modules element)
   * @param   {string}    cancel,     jQuery selector for items that will not trigger selection, defaults to 'button, select, input, textarea, a'
   * @param   {function}  onChange,   callback to run after selection changes, receives (event, selectedItems, itemsSelected, itemsDeselected)
   *
   *
   * Public methods may be called on the module element like this: $(moduleElement).selectable('methodName')
   *
   * @method  selectAll         Selects all selectable items.
   * @method  clearSelection    Deselects all selected items.
   * @method  selectedItems     Returns a jQuery selection containing all selected items.
   * @method  selectableItems   Returns a jQuery selection containing all items that may be selected.
   *
   */

  function Selectable(container, opts) {
    _setOptions.call(this, opts)
    this.uuid = _uuid()

    container = this._container = $(container)
    container.on('mousedown mouseup touchstart touchend', this.selector, _selectClick.bind(this))
    container.data('selectable', this)

    _bindSelectableClickListener.call(this)
    if (!selectableEvents) _initSelectableEvents()
  }

  // Public Methods

  Selectable.prototype = {

    cancel: 'button, select, input, textarea, a, .select2-container', // pull .select2-container out into sport admin!

    selectableItems: function(){
      return this._container.find(this.selector)
    },

    selectedItems: function(){
      return this.selectableItems().filter('.selected')
    },

    selectAll: function(e){
      var $modified = this.selectableItems().filter(':visible').addClass('selected')
      _callback.call(this, 'onChange', e, $modified)
    },

    clearSelection: function(e, opts){
      var $modified = this.selectedItems().removeClass('selected')
      if (!opts || !opts.silent) _callback.call(this, 'onChange', e, $modified)
    }

  }

  // Module Setup

  $.fn.selectable = function(opts) {
    var oldSelectable = this.data('selectable')

    // reset options for existing module
    if (oldSelectable) {
      if (typeof opts === 'string') return _method.call(oldSelectable, opts)
      _setOptions.call(oldSelectable, opts)
    }

    // or create a new module
    else new Selectable(this, opts)

    return this
  }

  // Private Methods

  // Global event setup for tracking modifier keys
  // We only do this once to avoid duplicate events
  var groupSelectModifier = false
  var multiSelectModifier = false
  var selectableEvents = false
  var mac = !!~navigator.userAgent.indexOf('Mac OS')

  function _initSelectableEvents(){
      selectableEvents = true

    // listen for modifier keys globally
    $(document).on('keyup keydown', function(e){
      var bool = e.type === 'keydown'
      var SHIFT = e.which === 16
      var CMD_CTRL = (mac && ~[91,93].indexOf(e.which)) || (!mac && e.which === 17)
      if (SHIFT) groupSelectModifier = bool
      else if (CMD_CTRL) multiSelectModifier = bool
    })

    // prevent command key from staying 'down' after navigating with the keyboard
    // by reseting the flag on blur... Too bad this isn't tracked automatically :(
    if (mac) $(window).on('blur', function(){ multiSelectModifier = false })
  }

  // simple unique id
  var uuid = 0
  function _uuid() {
    return "selectable-"+(uuid++)
  }

  function _setOptions(opts) {
    opts = this.opts = opts || {}
    this.selector = opts.selector || this.selector || '>*'
    this.cancel = opts.cancel || this.cancel
    return this
  }

  function _bindSelectableClickListener() {
    if (this._documentClickBound) return
    this._documentClickBound = true

    $(document).on('mouseup.'+this.uuid, function(e){

      // do nothing if a selectable element was clicked
      if (e.originalEvent && e.originalEvent._snuiSelectableClick) return

      // do nothing if an input was clicked
      if ($(e.target).closest(this.cancel).length) return

      // otherwise, unselect everything
      this.clearSelection(e)
      this._documentClickBound = false

    }.bind(this))
  }

  function _unbindSelectableClickListener() {
    $(document).off('mouseup.'+this.uuid)
  }

  function _selectClick(e) {
    // can't select by clicking on input elements or links
    if ($(e.target).closest(this.cancel).length) return

    e.preventDefault()
    _bindSelectableClickListener.call(this)
    e.originalEvent = e.originalEvent || {} // required for test mock events to work
    e.originalEvent._snuiSelectableClick = true

    var el = e.currentTarget
    var $el = $(el)
    var selected = $el.is('.selected')

    var type = e.type
    var mousedown = type === 'mousedown'
    var mouseup = type === 'mouseup'
    var touchstart = type === 'touchstart'
    var touchend = type === 'touchend'

    if (mousedown || touchstart) {
      if (!selected) {
        if (mousedown && !multiSelectModifier && !groupSelectModifier) {
          this.clearSelection(e, {silent: true})
        }
        if (groupSelectModifier) {
          _selectGroup.call(this, e, $el)
        } else {
          _selectItem.call(this, e, $el)
        }
        this._lastElClicked = el
      }
      $el.data('justSelected', !selected)
    }
    else if (mouseup || touchend) {
      if (!$el.data('justSelected')) {
        var oldSelectedItemCount = this.selectedItems().length
        if (mouseup && !multiSelectModifier && !groupSelectModifier && oldSelectedItemCount > 1) {
          this.clearSelection(e, {silent: true})
          _selectItem.call(this, e, $el)
        }
        else if (groupSelectModifier) {
          _selectGroup.call(this, e, $el)
        } else {
          _deselectItem.call(this, e, $el)
        }
        this._lastElClicked = el

        // manage document level click events (for clearing the selection)
        var newSelectedItemCount = this.selectedItems().length
        if (!newSelectedItemCount) {
          _unbindSelectableClickListener.call(this)
        } else if (!oldSelectedItemCount) {
          _bindSelectableClickListener.call(this)
        }
      }
    }

  }

  function _selectItem(e, $el, opts) {
    $el.addClass('selected')
    if (!opts || !opts.silent) _callback.call(this, 'onChange', e, $el)
  }

  function _deselectItem(e, $el, opts) {
    $el.removeClass('selected')
    if (!opts || !opts.silent) _callback.call(this, 'onChange', e, undefined, $el)
  }

  function _selectGroup(e, $el) {
    var selected = $el.is('.selected')
    var selectableItems = this.selectableItems().filter(':visible').get()
    var lastIndex = selectableItems.indexOf(this._lastElClicked)
    var index = selectableItems.indexOf($el.get()[0])
    // don't include self in range, that gets handled last
    var range = (index > lastIndex) ? selectableItems.slice(lastIndex, index) : selectableItems.slice(index+1, lastIndex+1)

    var $modified = $() // selected or deselected depending on the situation

    // select or deselect all items in range
    if (range.length) {
      for (var i in range) {
        var $item = $(range[i])
        if (!selected) {
          if (!$item.is('.selected')) $modified = $modified.add($item)
          _selectItem.call(this, e, $item, {silent: true})
        }
        else {
          if ($item.is('.selected')) $modified = $modified.add($item)
          _deselectItem.call(this, e, $item, {silent: true})
        }
      }
    }

    // select or deselect the clicked item
    if (!selected) {
      if (!$el.is('.selected')) $modified = $modified.add($el)
      _selectItem.call(this, e, $el, {silent: true})
    } else {
      if ($el.is('.selected')) $modified = $modified.add($el)
      _deselectItem.call(this, e, $el, {silent: true})
    }

    // trigger callback
    _callback.call(this, 'onChange', e, $modified)
  }

  function _callback(callback, e) {
    var fn = this.opts[callback]
    var args = [e, this.selectedItems()].concat(Array.prototype.slice.call(arguments, 2))
    if (typeof fn === 'function') fn.apply(null, args)
  }

  function _method(method) {
    if (typeof this[method] === 'function') return this[method]()
  }


})(jQuery)
