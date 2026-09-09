/**
 * Ecomexperts Shopify Theme Extension Logic
 * Pure Vanilla JavaScript implementation (No jQuery)
 * Features: Interactive Hotspots, Quick-View Modal, Dynamic Variant Switching,
 * Ajax Cart Addition, and Automatic Complimentary Item (Black + Medium rule)
 */

(function () {
  'use strict';

  // Modal DOM elements cache
  let modalBackdrop = null;
  let modalDialog = null;
  let modalCloseBtn = null;
  let modalMedia = null;
  let modalTitle = null;
  let modalPrice = null;
  let modalDesc = null;
  let modalSwatchesContainer = null;
  let modalSizeSelect = null;
  let modalAddBtn = null;
  let modalFeedback = null;

  // Active state
  let currentProductData = null;
  let selectedColor = null;
  let selectedSize = null;
  let currentMatchingVariant = null;
  let bonusProductVariantId = null;

  /**
   * Initialize DOM references and event listeners
   */
  function initEcomexperts() {
    modalBackdrop = document.getElementById('ee-modal-backdrop');
    if (!modalBackdrop) return;

    modalDialog = modalBackdrop.querySelector('.ee-modal-dialog');
    modalCloseBtn = modalBackdrop.querySelector('.ee-modal-close');
    modalMedia = modalBackdrop.querySelector('.ee-modal-image');
    modalTitle = modalBackdrop.querySelector('.ee-modal-title');
    modalPrice = modalBackdrop.querySelector('.ee-modal-price');
    modalDesc = modalBackdrop.querySelector('.ee-modal-description');
    modalSwatchesContainer = modalBackdrop.querySelector('.ee-swatches');
    modalSizeSelect = modalBackdrop.querySelector('.ee-size-select');
    modalAddBtn = modalBackdrop.querySelector('.ee-btn-add-cart');
    modalFeedback = modalBackdrop.querySelector('.ee-cart-feedback');

    // Retrieve global bonus variant ID (Soft Winter Jacket) set from Customizer
    const gridSectionEl = document.querySelector('.ee-grid-section');
    if (gridSectionEl) {
      bonusProductVariantId = gridSectionEl.getAttribute('data-bonus-variant-id');
    }

    // Attach Hotspot Click Handlers to all product cards
    const hotspotBtns = document.querySelectorAll('.ee-hotspot-btn');
    hotspotBtns.forEach(function (btn) {
      btn.addEventListener('click', handleHotspotClick);
    });

    // Close Modal Events
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeModal);
    }

    modalBackdrop.addEventListener('click', function (e) {
      if (e.target === modalBackdrop) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('is-active')) {
        closeModal();
      }
    });

    // Add to Cart Click Event
    if (modalAddBtn) {
      modalAddBtn.addEventListener('click', handleAddToCart);
    }
  }

  /**
   * Handle hotspot click event to open Quick-View Modal
   */
  function handleHotspotClick(e) {
    e.preventDefault();
    const cardEl = e.currentTarget.closest('.ee-grid-card');
    if (!cardEl) return;

    const dataScript = cardEl.querySelector('.ee-product-data');
    if (!dataScript) return;

    try {
      currentProductData = JSON.parse(dataScript.textContent);
      openModal(currentProductData);
    } catch (err) {
      console.error('Error parsing product data:', err);
    }
  }

  /**
   * Render and open modal with product details
   */
  function openModal(product) {
    if (!product) return;

    // Reset feedback
    if (modalFeedback) {
      modalFeedback.textContent = '';
      modalFeedback.className = 'ee-cart-feedback';
    }

    // Basic Product Info
    modalTitle.textContent = product.title || 'Product Title';
    modalPrice.textContent = formatPrice(product.price);
    modalDesc.textContent = product.description || 'No description available.';
    modalMedia.src = product.featured_image || 'https://via.placeholder.com/400x500';
    modalMedia.alt = product.title || 'Product Image';

    // Parse options & variants
    setupVariantSelectors(product);

    // Show Modal
    modalBackdrop.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close Modal
   */
  function closeModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('is-active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Dynamically build Color Swatches & Size Selectors from Product Data
   */
  function setupVariantSelectors(product) {
    modalSwatchesContainer.innerHTML = '';
    modalSizeSelect.innerHTML = '';

    const options = product.options || [];
    const variants = product.variants || [];

    // Find Color option index and Size option index
    let colorOptionIndex = -1;
    let sizeOptionIndex = -1;

    options.forEach(function (opt, idx) {
      const name = (typeof opt === 'string' ? opt : opt.name || '').toLowerCase();
      if (name.includes('color') || name.includes('colour')) {
        colorOptionIndex = idx;
      } else if (name.includes('size')) {
        sizeOptionIndex = idx;
      }
    });

    // Default to first variant values if option indices not explicitly matched
    if (colorOptionIndex === -1) colorOptionIndex = 0;
    if (sizeOptionIndex === -1 && options.length > 1) sizeOptionIndex = 1;

    // Extract unique values
    const colorValues = getUniqueOptionValues(variants, colorOptionIndex);
    const sizeValues = getUniqueOptionValues(variants, sizeOptionIndex);

    // Initial selected values
    selectedColor = colorValues[0] || null;
    selectedSize = sizeValues[0] || null;

    // Render Color Swatches
    colorValues.forEach(function (val, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ee-swatch-btn' + (i === 0 ? ' is-selected' : '');
      btn.textContent = val;
      btn.addEventListener('click', function () {
        modalSwatchesContainer.querySelectorAll('.ee-swatch-btn').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        selectedColor = val;
        updateMatchingVariant(product, colorOptionIndex, sizeOptionIndex);
      });
      modalSwatchesContainer.appendChild(btn);
    });

    // Render Size Dropdown Options
    sizeValues.forEach(function (val) {
      const optEl = document.createElement('option');
      optEl.value = val;
      optEl.textContent = val;
      modalSizeSelect.appendChild(optEl);
    });

    modalSizeSelect.onchange = function () {
      selectedSize = modalSizeSelect.value;
      updateMatchingVariant(product, colorOptionIndex, sizeOptionIndex);
    };

    // Update variant matching
    updateMatchingVariant(product, colorOptionIndex, sizeOptionIndex);
  }

  /**
   * Helper to get unique option values across variants
   */
  function getUniqueOptionValues(variants, optionIndex) {
    const set = [];
    variants.forEach(function (v) {
      const val = v.options ? v.options[optionIndex] : v['option' + (optionIndex + 1)];
      if (val && set.indexOf(val) === -1) {
        set.push(val);
      }
    });
    return set;
  }

  /**
   * Find variant matching selected color & size
   */
  function updateMatchingVariant(product, colorIndex, sizeIndex) {
    const variants = product.variants || [];

    currentMatchingVariant = variants.find(function (v) {
      const vColor = v.options ? v.options[colorIndex] : v['option' + (colorIndex + 1)];
      const vSize = v.options ? v.options[sizeIndex] : v['option' + (sizeIndex + 1)];

      const colorMatch = !selectedColor || (vColor && vColor.toLowerCase() === selectedColor.toLowerCase());
      const sizeMatch = !selectedSize || (vSize && vSize.toLowerCase() === selectedSize.toLowerCase());
      return colorMatch && sizeMatch;
    });

    // Fallback to first variant if exact combo not found
    if (!currentMatchingVariant && variants.length > 0) {
      currentMatchingVariant = variants[0];
    }

    if (currentMatchingVariant) {
      modalPrice.textContent = formatPrice(currentMatchingVariant.price);
      if (currentMatchingVariant.featured_image && currentMatchingVariant.featured_image.src) {
        modalMedia.src = currentMatchingVariant.featured_image.src;
      }
      modalAddBtn.disabled = !currentMatchingVariant.available;
      modalAddBtn.textContent = currentMatchingVariant.available ? 'ADD TO CART ->' : 'SOLD OUT';
    }
  }

  /**
   * Handle Ajax Add to Cart Submission
   * Includes check for Black + Medium variant rule to automatically add Soft Winter Jacket
   */
  function handleAddToCart() {
    if (!currentMatchingVariant || !currentMatchingVariant.id) {
      showFeedback('Please select a valid product variant.', 'is-error');
      return;
    }

    modalAddBtn.disabled = true;
    modalAddBtn.textContent = 'ADDING...';

    // Check if selected variant options contain "Black" AND "Medium"
    const optionsArray = currentMatchingVariant.options || [
      currentMatchingVariant.option1,
      currentMatchingVariant.option2,
      currentMatchingVariant.option3
    ];

    const hasBlack = optionsArray.some(function (opt) {
      return opt && opt.toLowerCase().includes('black');
    });

    const hasMedium = optionsArray.some(function (opt) {
      return opt && (opt.toLowerCase() === 'm' || opt.toLowerCase().includes('medium'));
    });

    const isBlackAndMedium = hasBlack && hasMedium;

    // Build Ajax payload items array
    const items = [
      {
        id: currentMatchingVariant.id,
        quantity: 1
      }
    ];

    // AUTOMATIC ADD TO CART: Include Soft Winter Jacket if Black + Medium criteria is met
    if (isBlackAndMedium && bonusProductVariantId) {
      items.push({
        id: parseInt(bonusProductVariantId, 10),
        quantity: 1
      });
    }

    // Call Shopify Ajax Cart API using Vanilla JS Fetch
    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ items: items })
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to add item to cart');
        }
        return response.json();
      })
      .then(function (data) {
        modalAddBtn.disabled = false;
        modalAddBtn.textContent = 'ADD TO CART ->';

        if (isBlackAndMedium && bonusProductVariantId) {
          showFeedback('Item added! "Soft Winter Jacket" was automatically added to your cart.', 'is-success');
        } else {
          showFeedback('Successfully added to cart!', 'is-success');
        }

        // Trigger Shopify Theme Cart Refresh events if present
        refreshShopifyCart();
      })
      .catch(function (error) {
        console.error('Cart add error:', error);
        modalAddBtn.disabled = false;
        modalAddBtn.textContent = 'ADD TO CART ->';
        showFeedback('Error adding item to cart. Please try again.', 'is-error');
      });
  }

  /**
   * Trigger native cart updates in theme
   */
  function refreshShopifyCart() {
    // Standard Shopify PubSub or Cart Drawer fetch events
    if (window.Shopify && window.Shopify.onItemAdded) {
      window.Shopify.onItemAdded();
    }
    document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('cart:build', { bubbles: true }));
  }

  /**
   * Helper to format raw cents/prices
   */
  function formatPrice(cents) {
    if (typeof cents === 'string' && cents.includes('€')) return cents;
    if (typeof cents === 'string' && cents.includes('$')) return cents;
    const amount = (parseFloat(cents) / 100).toFixed(2);
    return amount + ' €';
  }

  /**
   * Helper to display feedback text inside modal
   */
  function showFeedback(msg, className) {
    if (modalFeedback) {
      modalFeedback.textContent = msg;
      modalFeedback.className = 'ee-cart-feedback ' + className;
    }
  }

  // Run initialization on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEcomexperts);
  } else {
    initEcomexperts();
  }
})();
