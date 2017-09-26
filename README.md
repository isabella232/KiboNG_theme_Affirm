# Affirm Payments Mozu Core Theme

This repository contains the full source files for the Mozu Core 9.6.0 theme, with the required changes to enable Pay with Affirm on your Mozu storefront.
These theme changes support the Pay with Affirm Application by Mozu. Go to the [Mozu App Marketplace](https://www.mozu.com/marketplace/) to learn more about the app and to request installation on your tenant.

**Tip:** Refer to the [Mozu Core Theme](https://github.com/Mozu/core-theme) readme for information about general updates included in Mozu Core9. The branches of the core-theme repo also include readmes for older versions of the Core Theme.

##Build this Theme

You can use the [Mozu Theme Generator](https://www.npmjs.com/package/generator-mozu-theme) to update an existing theme to include changes in this repo. You can also run the generator in an empty directory to clone these files as the basis for a brand new theme.

When you run the Mozu Theme Generator, the tools create a git remote to the Mozu Core 9.6.0 repository. In the future, if you run the generator from your local theme directory, the tool will automatically check the Mozu Core theme for updates and offer to merge them for you.

###Create a Theme in Mozu Dev Center
1.  In the Dev Center Console, click **Develop > Themes.**
2.  Click **Create Theme**.
3.  Note the **Application Key**.

###Install the Generator
1.  Open a Terminal (OS X) or a Command Prompt (Windows).
2.  Install the Yeoman command-line tool globally: <br/>
`npm install -g yo`
3.  Install the Grunt command-line tool globally: <br/>
`npm install -g grunt-cli`
4.  Install the Mozu Theme Generator globally:<br/>
`npm install -g generator-mozu-theme`

###Run the Generator
1.  Run the Yeoman generator in a directory that contains your theme files. If you are creating a brand new theme, you can run the tool in an empty directory: <br/>
`yo mozu-theme`<br/>
   - **Note:** If you are installing the theme to a non-production Mozu environment, use: <br/> `yo mozu-theme --internal`
<br/>The tool will prompt you to select your environment.
2.  Select **Existing theme from repository**.
3.  Enter the URL for this repository:<br/> `https://github.com/Affirm/KiboNG_theme_Affirm.git`<br/> and hit **Enter**.
4.  Follow the prompts to enter your Dev Center Application Key and login information. The generator runs and creates or merges all the Kibo-Affirm-Payments-Theme files in your theme directory.
5.  Run `grunt` in your theme directory to upload the theme files to Mozu Dev Center.
6.  View the theme in Dev Center to see your uploaded files and Install the theme to a sandbox. Apply the theme to see the Affirm Promotional Messages into Product and Cart and also the Pay with Affirm option into your Checkout pages. <br/>
   - **Note:** You must configure Pay with Affirm in your Payment settings in Mozu Admin to use the Affirm Payments Application.

##Additional Resources

* [Pay with Affirm Application by Mozu Configuration Guide](https://www.mozu.com/docs/guides/mozu-apps/)*
* [Mozu Theme Development Quickstart](https://www.mozu.com/docs/developer/themes/)
* [Mozu Theme Generator 2.0](https://www.npmjs.com/package/generator-mozu-theme) (npm Package)

**Note:** You must log in with your Mozu Developer Account credentials to access content at [https://www.mozu.com/docs/guides](https://www.mozu.com/docs/guides/guides.htm)
