### 3.0.10.SNCF 
Contains 3.0.10 initial version and specific features:

Access a specific endpoint from a URL using anchors. Verbs can be accessed by appending a @ followed by the verb. For instance #accounts@POST.
Added the ability to load a RAML file from a Git repository (via HTTP) The Git repository needs to be proxyfied under the same origin (the origin which serves the RAML Console)
Disabled client generator
View image in a new tab on click.
Add "Show example" button like "Show Schema"
Fixing sidebar body rendering
The tryit panel should be collapse by default


### 3.0.8.SNCF 
 
 * API Console now provides a new way to import your RAML file from your central Gitlab repository. You can now specify group, repository, tag and path where to get your raml file from. 
 * Raml file path can now be read from the query parameter `?raml=path-to-raml` 
 * Raml files can now be loaded from Gitlab by providing query parameter `?group=GG&repository=RR&branch=BB&path=PP` 