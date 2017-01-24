all: linuxbrew-lambda.zip

traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz:
	curl -O http://d6r77u77i8pq3.cloudfront.net/releases/traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz

ruby-stamp: traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz
	tar xf $<
	touch $@

brew-stamp:
	git clone --depth=1 https://github.com/Linuxbrew/brew
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-core brew/Library/Taps/homebrew/homebrew-core
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-developer brew/Library/Taps/linuxbrew/homebrew-developer
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-test-bot brew/Library/Taps/linuxbrew/homebrew-test-bot
	touch $@

linuxbrew-lambda.zip: ruby-stamp brew-stamp index.js brew bin bin.real info lib
	zip -qr $@ $^
