(function($){

    $.fn.shuffle = function() {

      var elements = this.get()
      var copy = [].concat(elements)
      var shuffled = []
      var placeholders = []

      // Shuffle the element array
      while (copy.length) {
        var rand = Math.floor(Math.random() * copy.length)
        var element = copy.splice(rand,1)[0]
        shuffled.push(element)
      }

      // replace all elements with a plcaceholder
      for (var i = 0; i < elements.length; i++) {
        var placeholder = document.createTextNode('')
        findAndReplace(elements[i], placeholder)
        placeholders.push(placeholder)
      }

      // replace the placeholders with the shuffled elements
      for (var i = 0; i < elements.length; i++) {
        findAndReplace(placeholders[i], shuffled[i])
      }

      return $(shuffled)

    }

    function findAndReplace(find, replace) {
      find.parentNode.replaceChild(replace, find)
    }

})(jQuery)
