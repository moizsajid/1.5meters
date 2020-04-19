# 1.5meters

Social distancing, especially in public spaces, has shown to be an important technique in reducing the impact of the coronavirus. Most public health authorities recommend keeping atleast a 1.5 meter distance from all others to reduce the risk of becoming infected, and infecting others. Where confirmed cases are found to be out in public, contact tracing teams must tediously work out who the infected person did, and could have come into contact with. Use-cases such as these represent the target applications of the 1.5meters system.

## What does it do?

1.5meters is a CV/ML-based system for keeping track of social distancing. Using deep-learning models, the system is able to detect people in footage (such as surveillance footage) and localise their position in the world relative to those around them. 

This enables the system to determine the distances between people and measure the degree to which people are socially distancing. With the information, the system is also able to track the potential spread of the virus from an infected individual, based on others they come in contact with.

1.5meters does not use any form of facial recognition (only detection) and is intended to work within a variety of use-cases which can utilise existing hardware to preserve individuals' privacy, while at the same time providing useful information for tracking social distacing and performing contact tracing.

## Structure

1.5meters consists of a backend and a frontend component. The backend side contains the machine learning components (in Python) and the frontend side provides a web-interface to enable rich 2D and 3D visualisation of the results, as well as useful metrics.

The frontend can connect to a backend using websockets technology for on-demand analysis, however it is also able to play back pre-computed results (recorded in JSON format).

## Take it for a spin

You can try out the front-end visualiser [here](https://moizsajid.github.io/1.5meters/).

Since there is no backend currently hooked up here, you can grab a pre-computed test file [here](https://1drv.ms/u/s!AofnT5-g2vXZgZAs6AZRpG2vluimiw?e=QTEgsj) to upload.


## Authors

* **Moiz Sajid** - Master of Informatics TUM
* **John Ridley** - Master of Informatics TUM

This project was submitted to hakaTUM 2020 hackathon under the government and society stream.

## Attributions

Pre-trained models (monoloco & pifpaf) and some ML boilerplate provided by the [VITA lab at EPFL](https://github.com/vita-epfl/monoloco).
The library has been additionally modified to be better faciliate real-world application in this system.
