
### 2.1.0

 * API Console now provides a new way to import your RAML file from your central Gitlab repository. You can now specify group, repository, tag and path where to get your raml file from.
 * Raml file path can now be read from the query parameter `?raml=path-to-raml`
 * Raml files can now be loaded from Gitlab by providing query parameter `?group=GG&repository=RR&branch=BB&path=PP`
