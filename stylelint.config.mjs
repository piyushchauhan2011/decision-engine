export default {
  extends: ["stylelint-config-standard"],
  rules: {
    // Component selectors are grouped by section; they do not share a cascade scope.
    "no-descending-specificity": null,
  },
};
