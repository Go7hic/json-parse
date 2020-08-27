let rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
let meta = {    // table of character substitutions
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  "\"": "\\\"",
  "\\": "\\\\"
};

let rep
let gap
let indent

export function JSONStringify(value, replacer, space) {
  let i;
  gap = "";
  indent = "";
  if (typeof space === "number") {
    for (i = 0; i < space; i += 1) {
        indent += " ";
    } 
  } else if (typeof space === "string") {
    // If the space parameter is a string, it will be used as the indent string.
      indent = space;
  }

  rep = replacer;
  if (replacer && typeof replacer !== "function" && (
      typeof replacer !== "object"
      || typeof replacer.length !== "number"
  )) {
      throw new Error("JSON.stringify");
  }

  return str("", {"": value});
}

// "{"a": 1}"
export function JSONParse(str: string) {
  if (typeof str !== 'string') {
    console.error('not a JSON data');
    return 
  }
  let i = 0;

  const value = parseValue();
  expectEndOfInput();
  return value;

  /**
   * 解析对象格式
   */
  function parseObject() {
    if (str[i] === "{") {
      i++;
      skipWhitespace();
      const result = {};

      let initial = true;
      // if it is not '}',
      // we take the path of string -> whitespace -> ':' -> value -> ...
      while (i < str.length && str[i] !== "}") {
        if (!initial) {
          eatComma();
          skipWhitespace();
        }
        const key = parseString();
        if (key === undefined) {
          expectObjectKey();
        }
        skipWhitespace();
        eatColon();
        const value = parseValue();
        result[key] = value;
        initial = false;
      }
      expectNotEndOfInput("}");
      // move to the next character of '}'
      i++;

      return result;
    }
  }

  /**
   * 解析数组格式
   */
  function parseArray() {
    if (str[i] === "[") {
      i++;
      skipWhitespace();

      const result = [];
      let initial = true;
      while (i < str.length && str[i] !== "]") {
        if (!initial) {
          eatComma();
        }
        const value = parseValue();
        result.push(value);
        initial = false;
      }
      expectNotEndOfInput("]");
      // move to the next character of ']'
      i++;
      return result;
    }
  }

  /**
   * 处理value值
   */
  function parseValue() {
    skipWhitespace();
    const value =
      parseString() ??
      parseNumber() ??
      parseObject() ??
      parseArray() ??
      parseKeyword("true", true) ??
      parseKeyword("false", false) ??
      parseKeyword("null", null);
    skipWhitespace();
    return value;
  }
  
  /**
   * 处理值为 true, false, null
   * @param name 
   * @param value 
   */
  function parseKeyword(name: string, value: boolean) {
    if (str.slice(i, i + name.length) === name) {
      i += name.length;
      return value;
    }
  }

  function skipWhitespace() {
    while (
      str[i] === " " ||
      str[i] === "\n" ||
      str[i] === "\t" ||
      str[i] === "\r"
    ) {
      i++;
    }
  }

  /**
   * 处理字符串格式
   */
  function parseString() {
    if (str[i] === '"') {
      i++;
      let result = "";
      while (i < str.length && str[i] !== '"') {
        if (str[i] === "\\") {
          const char = str[i + 1];
          if (
            char === '"' ||
            char === "\\" ||
            char === "/" ||
            char === "b" ||
            char === "f" ||
            char === "n" ||
            char === "r" ||
            char === "t"
          ) {
            result += char;
            i++;
          } else if (char === "u") {
            if (
              isHexadecimal(str[i + 2]) &&
              isHexadecimal(str[i + 3]) &&
              isHexadecimal(str[i + 4]) &&
              isHexadecimal(str[i + 5])
            ) {
              result += String.fromCharCode(
                parseInt(str.slice(i + 2, i + 6), 16)
              );
              i += 5;
            } else {
              i += 2;
              expectEscapeUnicode(result);
            }
          } else {
            expectEscapeCharacter(result);
          }
        } else {
          result += str[i];
        }
        i++;
      }
      expectNotEndOfInput('"');
      i++;
      return result;
    }
  }

  function isHexadecimal(char: string) {
    return (
      (char >= "0" && char <= "9") ||
      (char.toLowerCase() >= "a" && char.toLowerCase() <= "f")
    );
  }

  /**
   * 处理Number格式
   */
  function parseNumber() {
    let start = i;
    if (str[i] === "-") {
      i++;
      expectDigit(str.slice(start, i));
    }
    if (str[i] === "0") {
      i++;
    } else if (str[i] >= "1" && str[i] <= "9") {
      i++;
      while (str[i] >= "0" && str[i] <= "9") {
        i++;
      }
    }

    if (str[i] === ".") {
      i++;
      expectDigit(str.slice(start, i));
      while (str[i] >= "0" && str[i] <= "9") {
        i++;
      }
    }
    if (str[i] === "e" || str[i] === "E") {
      i++;
      if (str[i] === "-" || str[i] === "+") {
        i++;
      }
      expectDigit(str.slice(start, i));
      while (str[i] >= "0" && str[i] <= "9") {
        i++;
      }
    }
    if (i > start) {
      return Number(str.slice(start, i));
    }
  }

  function eatComma() {
    expectCharacter(",");
    i++;
  }

  function eatColon() {
    expectCharacter(":");
    i++;
  }

  // error handling 错误处理
  function expectNotEndOfInput(expected: string) {
    if (i === str.length) {
      printCodeSnippet(`Expecting a \`${expected}\` here`);
      throw new Error("JSON_ERROR_0001 Unexpected End of Input");
    }
  }

  function expectEndOfInput() {
    if (i < str.length) {
      printCodeSnippet("Expecting to end here");
      throw new Error("JSON_ERROR_0002 Expected End of Input");
    }
  }

  function expectObjectKey() {
    printCodeSnippet(`Expecting object key here
      For example:
      { "foo": "bar" }
        ^^^^^`
    );
    throw new Error("JSON_ERROR_0003 Expecting JSON Key");
  }

  function expectCharacter(expected: string) {
    if (str[i] !== expected) {
      printCodeSnippet(`Expecting a \`${expected}\` here`);
      throw new Error("JSON_ERROR_0004 Unexpected token");
    }
  }

  function expectDigit(numSoFar: string | any[]) {
    if (!(str[i] >= "0" && str[i] <= "9")) {
      printCodeSnippet(`JSON_ERROR_0005 Expecting a digit here
        For example:
        ${numSoFar}5
        ${" ".repeat(numSoFar.length)}^`
      );
      throw new Error("JSON_ERROR_0006 Expecting a digit");
    }
  }

  function expectEscapeCharacter(strSoFar: string) {
    printCodeSnippet(`JSON_ERROR_0007 Expecting escape character
      For example:
      "${strSoFar}\\n"
      ${" ".repeat(strSoFar.length + 1)}^^
      List of escape characters are: \\", \\\\, \\/, \\b, \\f, \\n, \\r, \\t, \\u`
    );
    throw new Error("JSON_ERROR_0008 Expecting an escape character");
  }

  function expectEscapeUnicode(strSoFar: string) {
    printCodeSnippet(`Expect escape unicode

      For example:
      "${strSoFar}\\u0123
      ${" ".repeat(strSoFar.length + 1)}^^^^^^`
    );
    throw new Error("JSON_ERROR_0009 Expecting an escape unicode");
  }

  function printCodeSnippet(message: string) {
    const from = Math.max(0, i - 10);
    const trimmed = from > 0;
    const padding = (trimmed ? 4 : 0) + (i - from);
    const snippet = [
      (trimmed ? "... " : "") + str.slice(from, i + 1),
      " ".repeat(padding) + "^",
      " ".repeat(padding) + message
    ].join("\n");
    console.log(snippet);
  }
}




function quote(string) {

  // If the string contains no control characters, no quote characters, and no
  // backslash characters, then we can safely slap some quotes around it.
  // Otherwise we must also replace the offending characters with safe escape
  // sequences.
  rx_escapable.lastIndex = 0;
  return rx_escapable.test(string)
      ? "\"" + string.replace(rx_escapable, function (a) {
          var c = meta[a];
          return typeof c === "string"
              ? c
              : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
      }) + "\""
      : "\"" + string + "\"";
}
  
function str(key, holder) {
  var i;          // The loop counter.
  var k;          // The member key.
  var v;          // The member value.
  var length;
  var mind = gap;
  var partial;
  var value = holder[key];
  if (
    value
    && typeof value === "object"
    && typeof value.toJSON === "function"
  ) {
      value = value.toJSON(key);
  }

  if (typeof rep === "function") {
    value = rep.call(holder, key, value);
  }
  switch (typeof value) {
    case "string":
        return quote(value);

    case "number":

        // JSON numbers must be finite. Encode non-finite numbers as null.

        return (isFinite(value))
            ? String(value)
            : "null";

    case "boolean":
      return String(value);
    case "null":
      // If the value is a boolean or null, convert it to a string. Note:
      // typeof null does not produce "null". The case is included here in
      // the remote chance that this gets fixed someday.

      return String(value);

    // If the type is "object", we might be dealing with an object or an array or
    // null.

    case "object":
      // Due to a specification blunder in ECMAScript, typeof null is "object",
      // so watch out for that case.

      if (!value) {
          return "null";
      }
      // Make an array to hold the partial results of stringifying this object value.

      gap += indent;
      partial = [];

// Is the value an array?

      if (Object.prototype.toString.apply(value) === "[object Array]") {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

        length = value.length;
        for (i = 0; i < length; i += 1) {
            partial[i] = str(i, value) || "null";
        }

          // Join all of the elements together, separated with commas, and wrap them in
          // brackets.
          v = partial.length === 0
              ? "[]"
              : gap
                  ? (
                      "[\n"
                      + gap
                      + partial.join(",\n" + gap)
                      + "\n"
                      + mind
                      + "]"
                  )
                  : "[" + partial.join(",") + "]";
          gap = mind;
          return v;
      }

        // If the replacer is an array, use it to select the members to be stringified.

      if (rep && typeof rep === "object") {
          length = rep.length;
          for (i = 0; i < length; i += 1) {
              if (typeof rep[i] === "string") {
                  k = rep[i];
                  v = str(k, value);
                  if (v) {
                      partial.push(quote(k) + (
                          (gap)
                              ? ": "
                              : ":"
                      ) + v);
                  }
              }
          }
      } else {

        // Otherwise, iterate through all of the keys in the object.

          for (k in value) {
              if (Object.prototype.hasOwnProperty.call(value, k)) {
                  v = str(k, value);
                  if (v) {
                      partial.push(quote(k) + (
                          (gap)
                              ? ": "
                              : ":"
                      ) + v);
                  }
              }
          }
      }

          // Join all of the member texts together, separated with commas,
          // and wrap them in braces.

        v = partial.length === 0
            ? "{}"
            : gap
                ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                : "{" + partial.join(",") + "}";
        gap = mind;
        return v;
    }
}
