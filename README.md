# Simple Static Blog

Take Markdown (Frontmatter) files and generate a static HTML blog.

## Usage

```
./bin/simple-static-blog \
  --source <directory with .markdown files> \
  --destination <directory to output rendered HTML>
```

There are few requirements. Top-level pages should have the following directives.

```
template: toplevel
```

A slug can be specified to specify the output url. Otherwise, the file basename will be used. Note that a `/blog/` post doesn't need to specify the `/blog/` prefix for the slug.

```
slug: my-clean-url
```

That would generate a page at `mysite.com/my-clean-url/` or `mysite.com/blog/my-clean-url` depending on whether the `template` is `toplevel` or not.

A date should be specified for all blog posts to get proper sort order.

```
date: 2020-10-30 17:45:00
```

It is assumed all non-`toplevel` files are blog posts to be put in the index.

It is up to you to make sure the output directory is empty and to manually merge in static assets with the generated output.

## Contribute

Start typescript to watch source for changes.

```
npm run watch
```

Run the generator to test it.

```
~/path/to/simple-static-blog/bin/simple-static-blog \
  --source ~/path/to/markdown/files \
  --destination ~/path/to/output
```

Generate the binary symlinks locally.

```
npm link
```

If you use `nodenv` also run `nodenv rehash` to get the binary in your path.
