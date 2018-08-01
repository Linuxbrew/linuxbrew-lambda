all: linuxbrew-lambda.zip

clean:
	rm -rf brew brew-stamp ruby-stamp

deploy: linuxbrew-lambda.zip.json

.PHONY: all clean deploy

git-2.4.3.tar:
	curl -fO https://raw.githubusercontent.com/lambci/lambci/master/vendor/git-2.4.3.tar
	gsha256sum -c $@.sha256 || sha256sum -c $@.sha256

portable-ruby-%.x86_64_linux.bottle.tar.gz: portable-ruby-%.x86_64_linux.bottle.tar.gz.sha256
	curl -fLO https://homebrew.bintray.com/bottles-portable-ruby/$@
	gsha256sum -c $< || sha256sum -c $<

brew-stamp:
	git clone --depth=1 https://github.com/Linuxbrew/brew
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-developer brew/Library/Taps/linuxbrew/homebrew-developer
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-test-bot brew/Library/Taps/linuxbrew/homebrew-test-bot
	git clone --depth=50 https://github.com/Linuxbrew/homebrew-core brew/Library/Taps/homebrew/homebrew-core
	git clone --depth=50 https://github.com/Linuxbrew/homebrew-extra brew/Library/Taps/linuxbrew/homebrew-extra
	git clone --depth=50 https://github.com/Linuxbrew/homebrew-xorg brew/Library/Taps/linuxbrew/homebrew-xorg
	git clone --depth=50 https://github.com/brewsci/homebrew-base brew/Library/Taps/brewsci/homebrew-base
	git clone --depth=50 https://github.com/brewsci/homebrew-bio brew/Library/Taps/brewsci/homebrew-bio
	touch $@

# Also modify index.js when increasing this version number.
RUBY_VERSION=2.3.7
ruby-stamp: portable-ruby-$(RUBY_VERSION).x86_64_linux.bottle.tar.gz
	tar -C brew/Library/Homebrew/vendor -xf $<
	chmod u+w brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/bin/ruby
	gstrip brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/bin/ruby
	chmod u-w brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/bin/ruby
	rm -f brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/lib/libruby-static.a
	touch $@

linuxbrew-lambda.zip: git-2.4.3.tar index.js brew-stamp ruby-stamp
	rm -f $@
	zip -qr $@ git-2.4.3.tar index.js bin brew

linuxbrew-lambda.zip.json: linuxbrew-lambda.zip
	aws lambda update-function-code --function-name LinuxbrewTestBot --zip-file fileb://$< >$@

linuxbrew-lambda.test.output.json: linuxbrew-lambda.test.json
	curl -fd@$< https://p4142ivuwk.execute-api.us-west-2.amazonaws.com/prod/LinuxbrewTestBot?keep-old=1 >$@
