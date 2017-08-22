require(["modules/jquery-mozu", "underscore", "hyprlive", "modules/backbone-mozu", "modules/cart-monitor", "modules/models-product", "modules/views-productimages",  "hyprlivecontext", 'modules/affirmpay'], function ($, _, Hypr, Backbone, CartMonitor, ProductModels, ProductImageViews, HyprLiveContext, AffirmPay) {

    var ProductView = Backbone.MozuView.extend({
        templateName: 'modules/product/product-detail',
		renderOnChange: [ 'affirmMFP' ],
        additionalEvents: {
            "change [data-mz-product-option]": "onOptionChange",
            "blur [data-mz-product-option]": "onOptionChange",
            "change [data-mz-value='quantity']": "onQuantityChange",
            "keyup input[data-mz-value='quantity']": "onQuantityChange"
        },
		helpers: [ 'getAffirmMFP' ],
        render: function () {
            var me = this;
            Backbone.MozuView.prototype.render.apply(this);
            this.$('[data-mz-is-datepicker]').each(function (ix, dp) {
                $(dp).dateinput().css('color', Hypr.getThemeSetting('textColor')).on('change  blur', _.bind(me.onOptionChange, me));
            });
 			// refresh affirm banner
            AffirmPay.refresh();
        },
		getAffirmMFP: function(){
            var price = 0;
            if( !this.model.hasPriceRange() ){
                price = ( !this.model.get('price').onSale() ) ? this.model.get('price').get('price') : this.model.get('price').get('salePrice');
            }
            else{
                price = ( !this.model.get('priceRange').get( 'upper' ).onSale() ) ? this.model.get('priceRange').get( 'upper' ).get('price') : this.model.get('priceRange').get( 'upper' ).get('salePrice');
            }
            var mfp = false;
            mfp = AffirmPay.getProductPageMFP( this.model.get( 'productCode' ), this.model.get( 'categories' ), price );
            this.model.set( 'affirmMFP', { mfpValue: mfp.mfpValue || '', promoId: mfp.promoId || AffirmPay.promoId }  );
            return mfp;
        },
        onOptionChange: function (e) {
            return this.configure($(e.currentTarget));
        },
        onQuantityChange: _.debounce(function (e) {
            var $qField = $(e.currentTarget),
              newQuantity = parseInt($qField.val(), 10);
            if (!isNaN(newQuantity)) {
                this.model.updateQuantity(newQuantity);
            }
        },500),
        configure: function ($optionEl) {
            var newValue = $optionEl.val(),
                oldValue,
                id = $optionEl.data('mz-product-option'),
                optionEl = $optionEl[0],
                isPicked = (optionEl.type !== "checkbox" && optionEl.type !== "radio") || optionEl.checked,
                option = this.model.get('options').get(id);
            if (option) {
                if (option.get('attributeDetail').inputType === "YesNo") {
                    option.set("value", isPicked);
                } else if (isPicked) {
                    oldValue = option.get('value');
                    if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                        option.set('value', newValue);
                    }
                }
            }
        },
        addToCart: function () {
            this.model.addToCart();
        },
        addToWishlist: function () {
            this.model.addToWishlist();
        },
		getAffirmThreshold: function(){
            return AffirmPay.threshold;
        },
        getAffirmPromoId: function(){
            return AffirmPay.promoId;
        },
        shouldRenderAffirmBanner: function () {
            return ( AffirmPay && AffirmPay.isEnabled );
        },
        checkLocalStores: function (e) {
            var me = this;
            e.preventDefault();
            this.model.whenReady(function () {
                var $localStoresForm = $(e.currentTarget).parents('[data-mz-localstoresform]'),
                    $input = $localStoresForm.find('[data-mz-localstoresform-input]');
                if ($input.length > 0) {
                    $input.val(JSON.stringify(me.model.toJSON()));
                    $localStoresForm[0].submit();
                }
            });

        },
        initialize: function () {
            // handle preset selects, etc
            var me = this;
            this.$('[data-mz-product-option]').each(function () {
                var $this = $(this), isChecked, wasChecked;
                if ($this.val()) {
                    switch ($this.attr('type')) {
                        case "checkbox":
                        case "radio":
                            isChecked = $this.prop('checked');
                            wasChecked = !!$this.attr('checked');
                            if ((isChecked && !wasChecked) || (wasChecked && !isChecked)) {
                                me.configure($this);
                            }
                            break;
                        default:
                            me.configure($this);
                    }
                }
            });
        }
    });

    $(document).ready(function () {

        var product = ProductModels.Product.fromCurrent();
		product.set( 'affirmMFP', { mfpValue: false, promoId: false } );

        product.on('addedtocart', function (cartitem) {
            if (cartitem && cartitem.prop('id')) {
                product.isLoading(true);
                CartMonitor.addToCount(product.get('quantity'));
                window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + "/cart";
            } else {
                product.trigger("error", { message: Hypr.getLabel('unexpectedError') });
            }
        });

        product.on('addedtowishlist', function (cartitem) {
            $('#add-to-wishlist').prop('disabled', 'disabled').text(Hypr.getLabel('addedToWishlist'));
        });

        var productImagesView = new ProductImageViews.ProductPageImagesView({
            el: $('[data-mz-productimages]'),
            model: product
        });

        var productView = new ProductView({
            el: $('#product-detail'),
            model: product,
            messagesEl: $('[data-mz-message-bar]')
        });

		var mfpCallback = function(){
            return productView.getAffirmMFP();
        };
        // init Affirm Payment Promotional messaging
        AffirmPay.load( false, false , mfpCallback );
        window.productView = productView;

        productView.render();

    });

});
