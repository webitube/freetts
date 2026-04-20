# Title: Markdown syntax guide

## Headers

## Another Title: This is a Heading h1

## This is a Heading h2

### This is a Heading h3

#### This is a Heading h4

##### This is a Heading h5

###### This is a Heading h6

## Emphasis

*This text will be italic*  
**This text will be bold**  

*You **can** combine them*

## Lists

### Unordered

* Item 1a
* Item 1b
  * Item 2a
  * Item 2b
    * Item 3a
    * Item 3b
      * Item 4a
      * Item 4b
        * Item 5a
        * Item 5b
          * Item 6a
          * Item 6b
            * Item 7a
            * Item 7b

### Ordered

1. Item 1a
2. Item 1b
    1. Item 2a
    2. Item 2b
        1. Item 3a
        2. Item 3b
            1. Item 4a
            2. Item 4b
                1. Item 5a
                2. Item 5b
                    1. Item 6a
                    2. Item 6b

## Images

![This is an alt text.](https://commons.wikimedia.org/static/images/icons/commonswiki.svg "This is a sample image.")

## Links

You may be using [Markdown Live Preview](https://markdownlivepreview.com/).

## Blockquotes

> Markdown is a lightweight markup language with plain-text-formatting syntax, created in 2004 by John Gruber with Aaron Swartz.
>
>> Markdown is often used to format readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.

## Tables

| Left columns  | Right columns |
| ------------- |:-------------:|
| left foo      | right foo     |
| left bar      | right bar     |
| left baz      | right baz     |

## Blocks of code

```javascript
let message = 'Hello world';
alert(message);
```

## Inline code

This web site is using `markedjs/marked`.
