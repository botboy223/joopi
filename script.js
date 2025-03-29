function domReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

window.jsPDF = window.jspdf.jsPDF;

function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function loadFromLocalStorage(key) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

domReady(function () {
    let productDetails = loadFromLocalStorage('productDetails') || {};
    let cart = [];
    let upiDetails = loadFromLocalStorage('upiDetails') || {};
    let billHistory = loadFromLocalStorage('billHistory') || [];
    let inventory = loadFromLocalStorage('inventory') || {};

    const html5QrcodeScannerOption1 = new Html5QrcodeScanner(
        "my-qr-reader-option1",
        { fps: 30, qrbox: { width: 250, height: 250 } }
    );
    html5QrcodeScannerOption1.render((decodeText) => {
        document.getElementById('barcode').value = decodeText;
        const isCustomer = decodeText.startsWith('qrwale');
        const productFields = document.getElementById('product-fields');
        const customerFields = document.getElementById('customer-fields');
        
        if (isCustomer) {
            productFields.style.display = 'none';
            customerFields.style.display = 'block';
            if (productDetails[decodeText]) {
                document.getElementById('customer-name').value = productDetails[decodeText].name;
                document.getElementById('customer-phone').value = productDetails[decodeText].phone;
                document.getElementById('customer-discount').value = productDetails[decodeText].discount || 2;
            } else {
                document.getElementById('customer-name').value = '';
                document.getElementById('customer-phone').value = '';
                document.getElementById('customer-discount').value = 2;
            }
        } else {
            productFields.style.display = 'block';
            customerFields.style.display = 'none';
            if (productDetails[decodeText]) {
                document.getElementById('product-name').value = productDetails[decodeText].name;
                document.getElementById('product-price').value = productDetails[decodeText].price;
                document.getElementById('product-quantity').value = inventory[decodeText]?.quantity || 0;
            } else {
                document.getElementById('product-name').value = '';
                document.getElementById('product-price').value = '';
                document.getElementById('product-quantity').value = '';
            }
        }
    });

    const html5QrcodeScannerOption2 = new Html5QrcodeScanner(
        "my-qr-reader-option2",
        { fps: 30, qrbox: { width: 250, height: 250 } }
    );
    let lastScannedCode = '';
    
    html5QrcodeScannerOption2.render((decodeText) => {
        if (decodeText !== lastScannedCode && productDetails[decodeText]) {
            lastScannedCode = decodeText;
            const existingItem = cart.find(item => item.code === decodeText);
            if (!existingItem) {
                if (productDetails[decodeText].isCustomer) {
                    cart = cart.filter(item => !productDetails[item.code]?.isCustomer);
                    cart.push({ code: decodeText, quantity: 1 });
                } else if (inventory[decodeText]?.quantity > 0) {
                    cart.push({ code: decodeText, quantity: 1 });
                } else {
                    alert(`Out of stock for ${productDetails[decodeText].name}!`);
                    return;
                }
                displayCart();
            }
        } else if (!productDetails[decodeText]) {
            alert(`Item ${decodeText} not found!`);
        }
    });

    function displayCart() {
        const cartDiv = document.getElementById('cart');
        cartDiv.innerHTML = '';
        let customerDiscount = 0;
        cart.forEach((item, index) => {
            const product = productDetails[item.code];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item' + (product?.isCustomer ? ' customer' : '');
            
            if (product?.isCustomer) {
                customerDiscount = product.discount || 0;
                itemDiv.innerHTML = `
                    <span class="customer-name">Customer: ${product.name}</span>
                    <span class="customer-phone">Phone: ${product.phone}</span>
                    <span>Discount: ${customerDiscount}%</span>
                `;
            } else {
                itemDiv.innerHTML = `
                    <span class="product-name">${product?.name || 'Unknown'}</span>
                    <span class="product-price">Rs. ${product?.price?.toFixed(2) || '0.00'}</span>
                    <input type="number" 
                           value="${item.quantity}" 
                           min="1" 
                           data-index="${index}"
                           class="quantity-input">
                    <span class="item-total">Rs. ${(product?.price * item.quantity).toFixed(2) || '0.00'}</span>
                `;
            }
            cartDiv.appendChild(itemDiv);
        });
        calculateTotal(customerDiscount);
    }

    function calculateTotal(discountPercentage) {
        const subtotal = cart.reduce((sum, item) => {
            const product = productDetails[item.code];
            return product?.isCustomer ? sum : sum + (product?.price || 0) * item.quantity;
        }, 0);
        const discount = subtotal * (discountPercentage / 100);
        const total = subtotal - discount;
        document.getElementById('total').innerHTML = `
            <strong>Subtotal:</strong> Rs. ${subtotal.toFixed(2)}<br>
            <strong>Discount (${discountPercentage}%):</strong> Rs. ${discount.toFixed(2)}<br>
            <strong>Total:</strong> Rs. ${total.toFixed(2)}
        `;
        return { subtotal, discount, total };
    }

    document.getElementById('cart').addEventListener('input', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const index = e.target.dataset.index;
            const newQty = e.target.value === '' ? '' : parseInt(e.target.value);
            const productCode = cart[index].code;
            const oldQty = cart[index].quantity;

            // Allow empty input during typing, validate on blur
            if (newQty === '') return;

            if (!isNaN(newQty) && newQty > 0) {
                if (inventory[productCode].quantity >= newQty) {
                    cart[index].quantity = newQty;
                    displayCart();
                } else {
                    alert(`Only ${inventory[productCode].quantity} left in stock!`);
                    e.target.value = oldQty;
                }
            } else {
                alert('Quantity must be a positive number!');
                e.target.value = oldQty;
            }
        }
    });

    // Add blur event to validate after user finishes editing
    document.getElementById('cart').addEventListener('blur', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const index = e.target.dataset.index;
            const newQty = e.target.value === '' ? 1 : parseInt(e.target.value); // Default to 1 if empty
            const productCode = cart[index].code;
            const oldQty = cart[index].quantity;

            if (!isNaN(newQty) && newQty > 0) {
                if (inventory[productCode].quantity >= newQty) {
                    cart[index].quantity = newQty;
                    displayCart();
                } else {
                    alert(`Only ${inventory[productCode].quantity} left in stock!`);
                    e.target.value = oldQty;
                }
            } else {
                alert('Quantity must be a positive number! Resetting to 1.');
                cart[index].quantity = 1;
                displayCart();
            }
        }
    }, true);

    document.getElementById('save-barcode').addEventListener('click', () => {
        const barcode = document.getElementById('barcode').value.trim();
        const isCustomer = barcode.startsWith('qrwale');

        if (isCustomer) {
            const name = document.getElementById('customer-name').value.trim();
            const phone = document.getElementById('customer-phone').value.trim();
            const discount = parseFloat(document.getElementById('customer-discount').value) || 2;

            if (barcode && name && phone) {
                productDetails[barcode] = {
                    name,
                    phone,
                    discount,
                    isCustomer: true
                };
                saveToLocalStorage('productDetails', productDetails);
                alert('Customer saved!');
                document.getElementById('customer-name').value = '';
                document.getElementById('customer-phone').value = '';
                document.getElementById('customer-discount').value = 2;
            } else {
                alert('Fill all required fields!');
            }
        } else {
            const name = document.getElementById('product-name').value.trim();
            const price = parseFloat(document.getElementById('product-price').value);
            const quantity = parseInt(document.getElementById('product-quantity').value) || 0;

            if (barcode && name && !isNaN(price) && price > 0) {
                productDetails[barcode] = { name, price, isCustomer: false };
                inventory[barcode] = { name, price, quantity };
                saveToLocalStorage('productDetails', productDetails);
                saveToLocalStorage('inventory', inventory);
                alert('Product saved!');
                document.getElementById('product-name').value = '';
                document.getElementById('product-price').value = '';
                document.getElementById('product-quantity').value = '';
            } else {
                alert('Fill all required fields!');
            }
        }
    });

    document.getElementById('generate-bill').addEventListener('click', async () => {
        try {
            if (!upiDetails.upiId || !upiDetails.name || !upiDetails.note) {
                throw new Error('Configure UPI details first');
            }

            const customerItem = cart.find(item => productDetails[item.code]?.isCustomer);
            const discountPercentage = customerItem ? (productDetails[customerItem.code].discount || 0) : 0;
            const { subtotal, discount, total } = calculateTotal(discountPercentage);

            const doc = await generateBillPDF(total);

            billHistory.push({
                date: new Date().toLocaleString(),
                total: total.toFixed(2),
                discount: discount.toFixed(2),
                items: [...cart.filter(item => !productDetails[item.code]?.isCustomer)]
            });
            saveToLocalStorage('billHistory', billHistory);

            cart.forEach(item => {
                if (!productDetails[item.code]?.isCustomer) {
                    updateInventory(item.code, item.quantity);
                }
            });

            if (customerItem) {
                const customer = productDetails[customerItem.code];
                const billText = generateBillText(customer, subtotal, discount, total);
                const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodeURIComponent(billText)}`;
                window.open(whatsappUrl, '_blank');
            }

            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const pdfWindow = window.open(pdfUrl, '_blank');
            if (!pdfWindow) {
                alert('Please allow pop-ups to view the PDF bill');
            }

            cart = [];
            displayCart();
            updateDashboard();

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    function generateBillText(customer, subtotal, discount, total) {
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();
        const productItems = cart.filter(item => !productDetails[item.code]?.isCustomer);
        
        let itemsText = '';
        productItems.forEach(item => {
            const product = productDetails[item.code];
            const name = (product.name.length > 12 ? product.name.substring(0, 9) + '...' : product.name).padEnd(12, ' ');
            const qty = item.quantity.toString().padStart(2, ' ');
            const total = (product.price * item.quantity).toFixed(2).padStart(9, ' ');
            itemsText += `│ ${name} ${qty} ${total} │\n`;
        });

        const customerName = customer.name.length > 22 ? customer.name.substring(0, 19) + '...' : customer.name;
        const upiId = upiDetails.upiId.length > 22 ? upiDetails.upiId.substring(0, 19) + '...' : upiDetails.upiId;
        const payee = upiDetails.name.length > 22 ? upiDetails.name.substring(0, 19) + '...' : upiDetails.name;
        const note = upiDetails.note.length > 22 ? upiDetails.note.substring(0, 19) + '...' : upiDetails.note;

        return `
┌──────────────────────┐
│      BILL            │
└──────────────────────┘
Cust: ${customerName}
Ph: ${customer.phone}
Dt: ${date}
Tm: ${time}
┌──────────────────────┐
│ Items                │
├──────────────────────┤
│ Name         Qt Total │
├──────────────────────┤
${itemsText}├──────────────────────┤
│ Sub: Rs. ${subtotal.toFixed(2).padStart(10, ' ')} │
│ Disc(${customer.discount}%): Rs. ${discount.toFixed(2).padStart(6, ' ')} │
│ Tot: Rs. ${total.toFixed(2).padStart(10, ' ')} │
└──────────────────────┘
Pay:
UPI: ${upiId}
To: ${payee}
Note: ${note}
┌──────────────────────┐
│ Thank You!           │
└──────────────────────┘
`;
    }

    async function generateBillPDF(totalAmount) {
        const pageWidth = 48;
        const margin = 1;
        const maxLineWidth = pageWidth - (margin * 2);
        const lineHeight = 4;
        const qrHeight = 30;
        const contentHeight = calculateContentHeight(cart.filter(item => !productDetails[item.code]?.isCustomer).length) + qrHeight + 5;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pageWidth, contentHeight]
        });

        doc.setFont("courier");
        doc.setFontSize(8);
        let yPos = margin;

        doc.setFontSize(10);
        doc.text("INVOICE", pageWidth / 2, yPos, { align: 'center' });
        yPos += lineHeight;

        doc.setFontSize(8);
        doc.text(`Dt:${new Date().toLocaleDateString()}`, margin, yPos);
        yPos += lineHeight;
        doc.text(`Tm:${new Date().toLocaleTimeString()}`, margin, yPos);
        yPos += lineHeight;

        const productItems = cart.filter(item => !productDetails[item.code]?.isCustomer);
        if (productItems.length === 0) {
            doc.text("No Items", margin, yPos);
            yPos += lineHeight;
        } else {
            productItems.forEach(item => {
                const product = productDetails[item.code];
                const name = (product?.name || 'Unk').substring(0, 12).padEnd(12, ' ');
                const qty = item.quantity.toString().padStart(2, ' ');
                const amount = (product?.price * item.quantity).toFixed(2).padStart(7, ' ');
                doc.text(`${name}x${qty}Rs${amount}`, margin, yPos);
                yPos += lineHeight;
            });
        }

        const customerItem = cart.find(item => productDetails[item.code]?.isCustomer);
        const discountPercentage = customerItem ? (productDetails[customerItem.code].discount || 0) : 0;
        const { subtotal, discount } = calculateTotal(discountPercentage);

        yPos += lineHeight;
        doc.text("-".repeat(maxLineWidth / 2), pageWidth / 2, yPos, { align: 'center' });
        yPos += lineHeight;
        doc.text(`Sub:Rs${subtotal.toFixed(2)}`, margin, yPos);
        yPos += lineHeight;
        if (discountPercentage > 0) {
            doc.text(`Disc(${discountPercentage}%):Rs${discount.toFixed(2)}`, margin, yPos);
            yPos += lineHeight;
        }
        doc.text(`Tot:Rs${totalAmount.toFixed(2)}`, margin, yPos);
        yPos += lineHeight * 2;

        const upiUrl = `upi://pay?pa=${upiDetails.upiId}&pn=${encodeURIComponent(upiDetails.name)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(upiDetails.note)}`;
        const qrCode = new QRCodeStyling({
            width: 150,
            height: 150,
            data: upiUrl,
            dotsOptions: { color: "#000", type: "square" },
            backgroundOptions: { color: "#fff" }
        });

        const qrContainer = document.getElementById('bill-qr-code');
        qrContainer.innerHTML = '';
        qrCode.append(qrContainer);
        await new Promise(resolve => setTimeout(resolve, 500));
        const qrCanvas = qrContainer.querySelector('canvas');
        if (qrCanvas) {
            const qrData = qrCanvas.toDataURL('image/png');
            const qrWidth = 30;
            const qrX = (pageWidth - qrWidth) / 2;
            doc.addImage(qrData, 'PNG', qrX, yPos, qrWidth, qrWidth);
        }

        return doc;
    }

    function calculateContentHeight(itemCount) {
        const lineHeight = 4;
        return (lineHeight * 4) + (itemCount === 0 ? lineHeight : itemCount * lineHeight) + (lineHeight * 4);
    }

    document.getElementById('qrForm').addEventListener('submit', (e) => {
        e.preventDefault();
        upiDetails = {
            upiId: document.getElementById('upi_id').value.trim(),
            name: document.getElementById('name').value.trim(),
            note: document.getElementById('note').value.trim()
        };
        saveToLocalStorage('upiDetails', upiDetails);
        alert('UPI details saved!');
    });

    document.getElementById('option5-button').addEventListener('click', () => {
        const historyContainer = document.getElementById('bill-history');
        historyContainer.innerHTML = '';
        
        billHistory.forEach((bill, index) => {
            const billElement = document.createElement('div');
            billElement.className = 'bill-entry';
            billElement.innerHTML = `
                <h3>Bill #${index + 1}</h3>
                <p>Date: ${bill.date}</p>
                <ul>
                    ${bill.items.map(item => `
                        <li>${productDetails[item.code]?.name || 'Unknown'} 
                        (x${item.quantity}) - Rs. ${(productDetails[item.code]?.price * item.quantity).toFixed(2)}</li>
                    `).join('')}
                </ul>
                ${bill.discount > 0 ? `<p>Discount: Rs. ${bill.discount}</p>` : ''}
                <p>Total: Rs. ${bill.total}</p>
                <hr>
            `;
            historyContainer.appendChild(billElement);
        });
    });

    function updateInventory(barcode, quantityChange) {
        if (inventory[barcode]) {
            inventory[barcode].quantity -= quantityChange;
            if (inventory[barcode].quantity < 0) inventory[barcode].quantity = 0;
            saveToLocalStorage('inventory', inventory);
        }
    }

    function displayInventory() {
        const inventoryList = document.getElementById('inventory-list');
        inventoryList.innerHTML = '';
        for (const [barcode, data] of Object.entries(inventory)) {
            const item = document.createElement('div');
            item.innerHTML = `
                <span>${data.name}</span>
                <span>Price: Rs. ${data.price.toFixed(2)}</span>
                <span>Quantity: <input type="number" value="${data.quantity}" data-barcode="${barcode}" class="edit-quantity"></span>
                <button data-barcode="${barcode}" class="edit-product">Edit</button>
            `;
            inventoryList.appendChild(item);
        }

        document.querySelectorAll('.edit-quantity').forEach(input => {
            input.addEventListener('change', function() {
                const barcode = this.getAttribute('data-barcode');
                const newQuantity = parseInt(this.value);
                if (newQuantity >= 0) {
                    inventory[barcode].quantity = newQuantity;
                    document.getElementById('save-inventory').style.display = 'block';
                } else {
                    alert('Quantity cannot be negative!');
                    this.value = inventory[barcode].quantity;
                }
            });
        });

        document.querySelectorAll('.edit-product').forEach(button => {
            button.addEventListener('click', function() {
                const barcode = this.getAttribute('data-barcode');
                const product = inventory[barcode];
                document.getElementById('barcode').value = barcode;
                document.getElementById('product-name').value = product.name;
                document.getElementById('product-price').value = product.price;
                document.getElementById('product-quantity').value = product.quantity;
                switchToOption('option1');
                document.getElementById('save-inventory').style.display = 'block';
            });
        });

        document.getElementById('save-inventory').addEventListener('click', function() {
            saveToLocalStorage('inventory', inventory);
            this.style.display = 'none';
            alert('Inventory saved!');
            switchToOption('inventory-option');
            displayInventory();
        });
    }

    function updateDashboard() {
        let totalSales = billHistory.reduce((sum, bill) => sum + parseFloat(bill.total), 0);
        document.getElementById('total-sales').textContent = totalSales.toFixed(2);

        const lowStockList = document.getElementById('low-stock-items');
        lowStockList.innerHTML = '';
        Object.entries(inventory).filter(([_, item]) => item.quantity <= 5).forEach(([_, item]) => {
            const li = document.createElement('li');
            li.textContent = `${item.name} (${item.quantity} left)`;
            lowStockList.appendChild(li);
        });
    }

    function showMoreOptions(e) {
        e.stopPropagation();
        const moreOptions = document.getElementById('moreOptions');
        moreOptions.classList.toggle('hidden');
        setTimeout(() => {
            document.body.addEventListener('click', hideOptions);
        }, 10);
    }

    function hideOptions(e) {
        const moreOptions = document.getElementById('moreOptions');
        if (!moreOptions.contains(e.target) && e.target !== document.getElementById('moreButton')) {
            moreOptions.classList.add('hidden');
        }
    }

    function switchToOption(optionId) {
        document.querySelectorAll('.option').forEach(option => option.style.display = 'none');
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById(optionId).style.display = 'block';
        document.getElementById('moreOptions').classList.add('hidden');
    }

    const moreButton = document.getElementById('moreButton');
    moreButton.addEventListener('click', showMoreOptions);

    document.getElementById('option1-button').addEventListener('click', () => switchToOption('option1'));
    document.getElementById('option2-button').addEventListener('click', () => switchToOption('option2'));
    document.getElementById('option3-button').addEventListener('click', () => switchToOption('option3'));
    document.getElementById('option4-button').addEventListener('click', () => switchToOption('option4'));
    document.getElementById('option5-button').addEventListener('click', () => switchToOption('option5'));
    document.getElementById('inventory-button').addEventListener('click', () => {
        switchToOption('inventory-option');
        displayInventory();
    });

    switchToOption('option2');
    updateDashboard();
});
