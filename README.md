# **FreeTTS**

***Free Markdown Editor with integrated Web-based TTS. Lightweight. No downloads.***

*This project is a single-file application designed for portability and ease of integration.*

## **Key Features**

### **1\. Hybrid Editing Modes**

* **Reveal Codes (Source Mode):** A high-performance text editor for direct Markdown manipulation with monospace font support and syntax visibility.  
* **Visual Mode:** A WYSIWYG experience powered by the Milkdown framework, providing instant rendering of tables, blockquotes, and formatting.

### **2\. Smart Text-to-Speech (TTS)**

Unlike standard screen readers, our TTS engine is optimized for Markdown:

* **Syntax Cleaning:** Automatically strips structural symbols (like \#\#\#, \*\*, | \--- |) during playback to ensure natural-sounding speech.  
* **Word-Level Tracking:** Synchronizes the voice engine with the editor. As words are spoken, the corresponding text in the source code is automatically highlighted.  
* **Selection Support:** Highlight a specific paragraph to listen to it, or place the cursor to play from that point forward.

### **3\. Modern UI/UX**

* **Theme Switcher:** Seamless transition between Light and Dark modes, persisted via local storage.  
* **Responsive Design:** Built with Tailwind CSS to ensure a premium experience across mobile, tablet, and desktop.  
* **Integrated Guide:** A comprehensive built-in cheatsheet for Markdown syntax and TTS shortcuts.

## **Technical Stack**

* **Core Editor:** [Milkdown](https://milkdown.dev/) (Plugin-based WYSIWYG framework).  
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) for fluid layouts and dark mode.  
* **Icons:** [Lucide](https://lucide.dev/) (via SVG implementation).  
* **TTS Engine:** Native Web Speech API with custom regex cleaning logic.  
* **Module Management:** ESM via [esm.sh](https://esm.sh/).

## **How to Use**

1. **Compose:** Type your Markdown in "Reveal Codes" mode for precision or "Visual" mode for comfort.  
2. **Listen:** Select a block of text and click the Play icon in the header. Use the dropdown to switch between available system voices.  
3. **Export:** Use the **Copy** button to grab the raw Markdown to your clipboard or **Download .md** to save the file locally.  
4. **Customize:** Toggle the moon/sun icon to match your preferred environment.

## **Markdown Support**

The editor supports GitHub Flavored Markdown (GFM), including:

* Tables with alignment  
* Task lists \[x\]  
* Strike-through \~\~text\~\~  
* Code blocks with syntax highlighting placeholders  
* Blockquotes and nested lists

## **Screenshot**
![Screenshot](images/FreeTTSMarkdownEditor.png)
