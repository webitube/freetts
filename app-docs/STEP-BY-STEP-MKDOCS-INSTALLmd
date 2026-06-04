# **Step-by-Step Mkdocs Install**

Here are the complete, step-by-step installation instructions to configure a unified MkDocs environment capable of extracting documentation for Python, C\#, and TypeScript/JavaScript.

## **🐍 1\. Python Setup**

The foundational core of MkDocs runs on Python. \[1\]

1. **Create and activate a virtual environment** inside your project repository root:  
   `python -m venv venv`  
   *`# On macOS/Linux:`*  
   `source venv/bin/activate`  
   *`# On Windows (PowerShell):`*  
   `.\venv\Scripts\Activate.ps1`

2. **Install MkDocs**, the popular [**Material theme**](https://squidfunk.github.io/mkdocs-material/), and the official [**Python handler for mkdocstrings**](https://mkdocstrings.github.io/):  
   `pip install mkdocs mkdocs-material mkdocstrings[python]`

3. **Initialize the documentation layout**:  
   `mkdocs new .`  
   \[2\]

## ---

**🔶 2\. C\# Setup**

Because C\# generates XML documentation natively during compilation, we use a dedicated C\# parser extension to map those comments directly to MkDocs.

1. **Install the C\# handler companion plugin** via pip:  
   `pip install mkdocstrings-csharp`

2. **Configure your .csproj file** to ensure the C\# compiler explicitly exports its XML doc tags during builds. Open your application's project file and add these lines inside the main \<PropertyGroup\> block:  
   `<PropertyGroup>`  
     `<GenerateDocumentationFile>true</GenerateDocumentationFile>`  
     `<NoWarn>$(NoWarn);1591</NoWarn> <!-- Prevents warnings for undocumented public keys -->`  
   `</PropertyGroup>`  
   \[3\]

## ---

**🌐 3\. TypeScript / JavaScript Setup**

The TypeScript parser relies on **TypeDoc** on the Node.js layer to convert files into structural data, which MkDocs can read.

1. **Install the Node dependencies** globally or locally inside your JavaScript project folder:  
   `npm install -g typedoc`

2. **Install the TypeScript handler companion** in your active Python virtual environment:  
   `pip install mkdocstrings-typescript`

3. **Generate a baseline configuration** file named typedoc.json in your TypeScript root directory to map your source targets:  
   `{`  
     `"entryPoints": ["./src/index.ts"],`  
     `"entryPointStrategy": "expand"`  
   `}`  
   \[4\]

## ---

**🗺️ 4\. The Master mkdocs.yml Config File**

With all dependencies installed, update the **mkdocs.yml** file in your project root directory. This combines all three handlers into a single site configuration: \[5, 6\]

`site_name: Master Polyglot Documentation`

`theme:`  
  `name: material`

`plugins:`  
  `- mkdocstrings:`  
      `handlers:`  
        `python:`  
          `options:`  
            `docstring_style: google`  
        `typescript:`  
          `options:`  
            `show_source: true`  
        `csharp:`  
          `options:`  
            `show_source: true`

`nav:`  
  `- Home: index.md`  
  `- Python API: python_docs.md`  
  `- C# API: csharp_docs.md`  
  `- TypeScript API: ts_docs.md`

## ---

**🚀 5\. Injecting Code into Pages**

Create your Markdown files inside your docs/ folder, using the triple-colon (:::) syntax to point exactly to the packages or file boundaries you want to parse: \[6, 7\]

* **docs/python\_docs.md**:  
  `# Python Components`  
  `::: backend_app.auth_handler`

* **docs/csharp\_docs.md**:  
  `# C# Core Architecture`  
  `::: GeometryApp.RectangleMath`

* **docs/ts\_docs.md**:  
  `# TypeScript Utilities`  
  `::: src/utils/mathHelper.ts`

Run **mkdocs serve** in your terminal, and navigate to http://127.0.0.1:8000/ to view your multi-language aggregated site. \[6\]


**🌟 6\. Configure Mermaid Support**

```mkdocs.yml
site_name: Master Polyglot Documentation

theme:
  name: material

plugins:
  - mkdocstrings:
      handlers:
        python:
          options:
            docstring_style: google
        typescript:
          options:
            show_source: true
        csharp:
          options:
            show_source: true

# 🌟 ADD THIS BLOCK TO ENABLE MERMAID RENDERING
markdown_extensions:
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
```


\[1\] [https://www.sitepoint.com](https://www.sitepoint.com/building-product-documentation-mkdocs/)  
\[2\] [https://medium.com](https://medium.com/@pablo.lopez.santori/level-up-your-project-documentation-with-mkdocs-d04c2f92a2ff)  
\[3\] [https://ibm.github.io](https://ibm.github.io/SalesEnablement-L3-Guidance/machine-setup/03%20Install%20MKDOCS%20and%20plugins/)  
\[4\] [https://mkdocstrings.github.io](https://mkdocstrings.github.io/typescript/)  
\[5\] [https://github.com](https://github.com/mkdocstrings/typescript/blob/main/mkdocs.yml)  
\[6\] [https://www.mkdocs.org](https://www.mkdocs.org/getting-started/)  
\[7\] [https://mkdocstrings.github.io](https://mkdocstrings.github.io/usage/)