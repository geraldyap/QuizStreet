const toProperCase = function (s) {
    return s.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

const replaceAt = function(s, index, replacement) {
    return s.substring(0, index) + replacement + s.substring(index + replacement.length);
}

const trimAnswer = (answer) => {
    return toProperCase(answer.replace(/[^A-Za-z0-9 -]/g, ''));
}

const generateHint = (answer, iteration, prevHint = {}) => {
    if (iteration === 0) {
        return {
            hint: answer.replace(/[ ]/g, '  ').replace(/[A-Za-z0-9\-]/g, '_ ').trim(), // make each space 2 spaces, replace the rest with '_ ', trim the last space
            hintIndex: [],
            hintLength: 0
        }; 
    } else {
        const lengthWithoutSpaces = answer.replace(/[^A-Za-z0-9\-]/g, '').length;
        const newHintLength = Math.floor(lengthWithoutSpaces * (iteration === 1 ? 0.2 : 0.5));
        const hintsToShow = newHintLength - prevHint.hintLength;
        const hintIndex = prevHint.hintIndex;
        let newHint = prevHint.hint;
        for (let i = 0; i < hintsToShow; i++) { // iterate and reveal each char after generating index to reveal (check index again previous revealed indexes)
            let index = 0;
            do {
                index = Math.floor(Math.random() * lengthWithoutSpaces) * 2 // multiply by 2 because each char is converted to 2 chars
            } while(hintIndex.includes(index))
            newHint = replaceAt(newHint, index, answer.charAt(index/2));
            hintIndex.push(index);
        }
        return {
            hint: newHint,
            hintIndex,
            hintLength: newHintLength
        }

    }
}

function timeout(ms) {
    var timeout, promise, _reject, _resolve;
  
    promise = new Promise(function(resolve, reject) {
        _resolve = resolve;
        _reject = reject;
        timeout = setTimeout(function() {
            resolve('timeout done');
        }, ms);
    }); 
  
    return {
        promise: promise, 
        cancel: function() {
            clearTimeout(timeout ); 
            _resolve(); 
            _reject = null; 
            _resolve = null
        } //return a canceller as well
    };
}

module.exports = {
    trimAnswer,
    generateHint,
    timeout
}