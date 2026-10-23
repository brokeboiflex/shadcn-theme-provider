# Changelog

## 0.3.1

- Normalize missing saved palettes and invalid modes consistently in the init script and provider. Ignore unknown palette selections and retire removed names.
- Continue theming when localStorage reads or writes fail. Keep server-rendered theme consumers hydration-safe without overwriting browser preferences.
- Update stylesheets when their URL or nonce changes, remove stale styles for an empty theme map, and reconcile existing init-script links.
- Clean up transition timers, animation frames, listeners and markers on palette changes, unmount and Strict Mode replay. Remove conflicting mode attributes when the attribute strategy changes.
- Preserve the React entry's Next.js client boundary while keeping the script entry React-free and callable from server code. Add regression and package-entrypoint checks.
