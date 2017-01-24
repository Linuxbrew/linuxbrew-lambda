all: linuxbrew-lambda.zip

linuxbrew-lambda.zip: index.js
	zip $@ $^
