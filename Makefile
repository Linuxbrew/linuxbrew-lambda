all: linuxbrew-lambda.zip

traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz:
	curl -O http://d6r77u77i8pq3.cloudfront.net/releases/traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz

ruby-stamp: traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz
	tar xf $<
	touch $@

linuxbrew-lambda.zip: index.js ruby-stamp bin bin.real info lib
	zip -qr $@ $^
