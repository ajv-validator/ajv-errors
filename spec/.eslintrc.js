module.exports = {
  globals: {
    it: false,
    describe: false,
    beforeEach: false,
  },
  overrides: [
    {
      files: ["*.ts"],
      parserOptions: {
        project: ["./spec/tsconfig.json"],
      },
      rules: {
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-extraneous-class": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-unsafe-call": "off",
      },
    },
  ],
  rules: {
    "no-console": "off",
    "no-new-wrappers": "off",
    "no-invalid-this": "off",
    "no-template-curly-in-string": "off",
  },
}
