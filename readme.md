# Energy End-Use Database Dashboard

This is a dashboard for EECA's Energy End-Use Database, built with Quarto and Shiny for Python. Quarto provides the dashboard's document structure and layout, and Shiny provides the dashboard's interactivity.  This dashboard is deployed as an interactive application to EECA's shinyapps.io space.

[Live Dashboard]()

Note: This readme is a work in progress, and will be fleshed out further.

## How to install and run the dashboard

There are two things you will need to run the dashboard: Quarto and Python. This readme will assume the latter is already installed through Anaconda.

Install the Quarto CLI tool from the Quarto website: https://quarto.org/docs/download/. This dashboard requires only v1.4.x, the first Quarto release to include dashboard functionality. At the time of writing, v1.4.x is no longer in pre-release.

At the time of writing, [shinyapps.io only supports python 3.7.13, 3.8.13, 3.9.13](https://docs.posit.co/shinyapps.io/getting-started.html#deploying-applications-1). If an application is deployed using another version of python, shinyapps.io will attempt to run it on the closest major/minor version of python. For this reason, a Python 3.9.x virtual environment is used in the development of this dashboard.

* **Create** a Python 3.9.x Anaconda environment `conda create -n eeud python=3.9` and **activate** it `conda activate eeud`.
* **Navigate** your terminal into the project directory if you have not already done so.
* **Install** required Python libraries `python -m pip install -r requirements.txt`.
* **Render** the quarto document `quarto render index.qmd`. In this instance, `quarto` runs the CLI tool we installed earlier.
* **Preview** the shiny app `shiny run app.py`. In this instance, `shiny` executes a runtime package that is part of our Python environment, installed from our requirements.

## How to deploy the dashboard

We can deploy our dashboard to shinyapps.io using the `rsconnect-python` package that has been installed to our Python environment from our requirements. This requires some setup to connect our environment to EECA's shinyapps.io portal. Please follow the instructions on [this Posit docs page](https://docs.posit.co/shinyapps.io/getting-started.html#deploying-applications-1) to get set up with `rsconnect`.

In EECA's shinyapps.io portal, you can find the application id for the existing eeud_dashboard_quarto application. We can use this application id to deploy our dashboard to this application.

* **Deploy** to an existing application `rsconnect deploy shiny . -n eeca-nz -a 11701768`.

Note: If an application does not exist, or you would like to deploy the dashboard to a new application in the portal, you can deploy it with `rsconnect deploy shiny . -n eeca-nz -t "APPLICATION NAME HERE"`

## Potential issues

In the creation of deployment of this dashboard, a number of difficulties were encountered that may also be encountered by others attempting to run this dashboard.

* ***Permission Errors.*** Python runtime packages such as `shiny` or `rsconnect` may sometimes not work due to "access denied" permission complications. The cause of this has not been entirely ascertained, as the occurence of this complication has been inconsistent, and it may decide to work or break within a single terminal instance depending on any number of unknowable variables, up to and including the whims of the cosmos.
* ***Package Versioning.*** When deploying the dashboard to shinyapps.io, a number of problems can arise due to python package versioning, as shinyapps will be constructing its own virtual environment based on our requirements.txt. The current requirements.txt will see a successful deployment, so ammendments to this may require some trial-and-error.
    * Initially `pip freeze` was used to create the requirements.txt, however this created problems for shinyapps' virtual environment. After removing version restrictions from the list of packages as initially included by freezing proved more successful, however shinyapps's environment defaulted to installing a few packages with older versions than was required by the dashboard (notably the `shiny` and `shinywidgets` packages). Restoring version restrictions to just these necessary packages allowed for a successful deployment.
    * If additional packages are required to be installed for the dashboard going forward, the suggestion would be to manually add these to the requirements.txt without version restrictions, and to only add version restrictions if necessary.

## Additional documentation

* Quarto Dashboard docs: https://quarto.org/docs/dashboards/

* Shiny for Python docs: https://shiny.posit.co/py/api/core/

