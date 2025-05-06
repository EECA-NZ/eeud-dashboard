[![CI/CD](https://github.com/EECA-NZ/eeud-dashboard/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/EECA-NZ/eeud-dashboard/actions/workflows/ci-cd.yml)

# Energy End-Use Database Dashboard

This is a dashboard for EECA's Energy End-Use Database, built with Quarto and Shiny for Python. Quarto provides the dashboard's document structure and layout, and Shiny provides the dashboard's interactivity. This dashboard is deployed as an interactive application to EECA's shinyapps.io space.

[Live Production Dashboard](https://eeca-nz.shinyapps.io/eeud_dashboard_quarto/)
[Live Development Dashboard](https://eeca-nz.shinyapps.io/eeud_dashboard_quarto_dev/)

## How to install and run the dashboard locally

There are two things you will need to run the dashboard: Quarto and Python. This readme will assume the latter is already installed through Anaconda.

Install the Quarto CLI tool from the Quarto website: https://quarto.org/docs/download/. This dashboard requires only v1.4.x, the first Quarto release to include dashboard functionality. At the time of writing, v1.4.x is no longer in pre-release.

At the time of writing, [shinyapps.io only supports python 3.7.13, 3.8.13, 3.9.13](https://docs.posit.co/shinyapps.io/getting-started.html#deploying-applications-1). If an application is deployed using another version of python, shinyapps.io will attempt to run it on the closest major/minor version of python. For this reason, a Python 3.9.x virtual environment is used in the development of this dashboard.

-  **Create** a Python 3.9.x Anaconda environment `conda create -n eeud python=3.9` and **activate** it `conda activate eeud`.
-  **Navigate** your terminal into the project directory if you have not already done so.
-  **Install** required Python libraries `python -m pip install -r requirements.txt`.
-  **Render** the quarto document `quarto render index.qmd`. In this instance, `quarto` runs the CLI tool we installed earlier, and renders the dashboard, writing out a number of new files, including an html file and an app.py file.
-  **Host** the shiny app `shiny run app.py`. In this instance, `shiny` executes a runtime package that is part of our Python environment, installed from our requirements.

## How to deploy the dashboard

Deployment to shinyapps.io is done primarily via Github actions.

**Dev:** deployment occurs on any push to `main` branch. This will deploy to an existing desginated application within the shinyapps portal. Ensure that this version of the dashboard works well before deploying to production.

**Prod:** deployment occurs on any release tag that matches the pattern `v*.*.*`. This will create a new versioned application within the shinyapps portal.

### CI-CD process.

For Github actions to deploy the dashboard correctly, ensure the following repository secrets exist in the Secrets and Variables > Actions section of the repository settings. A user with access to EECA's shinyapps.io portal and the settings for this repo can update the repository secrets as needed.

-  **DEV_APP_ID**. This can be found by opening the shinyapps portal and navigating to the appropriate application. An Id number will be assigned to it. If a development application does not already exist for this dashboard, see "Creating a new dev app" below.

-  **SHINYAPPS_NAME**, **SHINYAPPS_SECRET**, and **SHINYAPPS_TOKEN**. See the instructions on [this Posit docs page](https://docs.posit.co/shinyapps.io/getting-started.html#deploying-applications-1) to get the name, secret, and token information necessary for `rsconnect` to deploy.

### Deployment workflow

Without being across all of the details right now, it should describe the process of tagging a release, checking the deployed app, getting the iframe embedding URL, giving that to MarComms to point the EECA website at, and cleaning up an old app, so that we retain a rolling window of recently released versions. That way we can simply refer to the README whenever we are ready to release a new version.

To deploy the dashboard to production, navigate to the repository's Releases page (this can be found on along the sidebar of the repository's main page). From the Releases page, we can *draft a new release*. *Choose a tag* for the release by typing a new tag that matches the pattern `v*.*.*`, adding an appropriate version number greater than the last. Click on *create new tag* to confirm the new release tag. Fill in the release title and description, ensure *Target* is set to *main*, and ensure *Set as the latest release* is checked. For pre-release versioning, check *Set as a pre-release*, and in the release tag use an appropriate affix such as `v*.*-beta.*` or `v*.*.*-alpha` to help distinguish it.

Upon publishing the release, an *Action* will be called. These actions are described in .github/workflows/ci-cd.yml, and can be monitored from the *Actions* tab of the repository. Open the workflow run connected to the release tag, and you should see deploy-prod running. Click into this if you wish to monitor the action in progress. This will take a few minutes, and should eventually should show a green tick once it is complete. 

Navigate to EECA's shinyapps portal at shinyapps.io, and find the newly deployed application. The new application's name should contain the version number from the release tag we created. Open the application and ensure that it is working as intended. Once it is ready to go live, go into the application's *Settings*; in the *General* tab, set the *Instance Size* to `2X-Large (4 GB)`, and in the *Advanced* tab, set *Max Worker Processes* to `5` and *Max Connections* to `50`.

To publish on EECA's website, send the application's URL to MarComms, who will embed this into the appropriate page's iframe. Once you have confirmed this has been done, *Archive* the old application within the shinyapps portal.

WIP: Custom URLs for applications on shinyapps is currently being investigated, so that MarComms won't have to manually update the iframe link each time a new release is made, instead making use of a static URL that can be applied to the latest application.

### Creating a new dev app

The easiest way to create a development application is to build the dashboard locally up to the **render** stage as detailed above, and then deploy it manually. Rsconnect will need to be configured to connect to EECA's shinyapps portal, see the instructions on [this Posit docs page](https://docs.posit.co/shinyapps.io/getting-started.html#deploying-applications-1) to set up `rsconnect` locally.

-  **Deploy** the application `rsconnect deploy shiny -n "ACCOUNT NAME HERE" -t "APPLICATION NAME HERE" -N`. This will create a new application within the shinyapps portal, using the given application name. Suggested naming convention is to use a lower-case and hyphen-delimited application name, for example `tool-dashboard-quarto`.

Important note: Please suffix this application name with `_dev` to ensure it can be easily distinguished on shinyapps.io from production versions. It may also be necessary to delete the rsconnect-python folder if the dashboard has already been deployed with another application name, as it might cache deployment information that can override the deployment target. For the account name used for deployment, please see the SHINYAPPS_NAME secret above.

### Potential deployment issues

In the testing of deployment of this dashboard, a number of difficulties were encountered that may also be encountered by others attempting to run this dashboard.

-  **_Permission Errors._** Python runtime packages such as `shiny` or `rsconnect` may sometimes not work due to "access denied" permission complications. The cause of this has not been entirely ascertained, as the occurence of this complication has been inconsistent. Try and rerun the action manually to resolve this, or try deploying from a WSL environment instead.
-  **_Package Versioning._** When deploying the dashboard to shinyapps.io, a number of problems can arise due to python package versioning, as shinyapps will be constructing its own virtual environment based on our requirements.txt. The current requirements.txt should allow for a successful deployment, so ammendments to this file may require some trial-and-error.
   -  Initially `pip freeze` was used to create the requirements.txt, however this created problems for shinyapps' virtual environment. After removing version restrictions from the list of packages as initially included by freezing proved more successful, however shinyapps's environment defaulted to installing a few packages with older versions than was required by the dashboard (notably the `shiny` and `shinywidgets` packages). Ensuring that these necessary packages use the latest version from GitHub allows for a successful deployment.
   -  A shortlist of necessary packages have been marked as "Dash Packages" within releases.txt, these are required for dashboards to deploy and operate properly. When making a new dashboard, copy these over to the new dashboard's requirements file. The remainder are marked as "Data Packages", which are requirements specific to this dashboard. In general, these will be the packages for the modules that are expressly imported within the dashboard's qmd file, excluding those that are built-in to Python, or those already covered by the Dash Packages group.
   -  If additional packages are required to be installed for the dashboard going forward, the suggestion would be to manually add these to requirements.txt without version restrictions, and to only add version restrictions where necessary.

## Additional documentation

-  Quarto Dashboard docs: https://quarto.org/docs/dashboards/

-  Shiny for Python docs: https://shiny.posit.co/py/api/core/
