var tblProducts;
var select_supplier, select_search_product, create_product;
var tblSearchProducts;

var sale = {
    details: {
        subtotal: 0.00,
        iva: 0.00,
        total: 0.00,
        products: [],
        products_review: []
    },
    getProductsIds: function () {
        return this.details.products.map(value => value.id);
    },
    calculateInvoice: function () {
        var subtotal = 0.00;
        var iva = $('input[name="iva"]').val();
        this.details.products.forEach(function (value, index) {
            value.index = index;
            value.cant = parseInt(value.cant);
            value.subtotal = value.cant * value.cost;
            subtotal += value.subtotal;
        });

        this.details.subtotal = subtotal;
        this.details.iva = this.details.subtotal * iva;
        this.details.total = this.details.subtotal + this.details.iva;

        $('input[name="subtotal"]').val(this.details.subtotal.toFixed(2));
        $('input[name="ivacalc"]').val(this.details.iva.toFixed(2));
        $('input[name="total"]').val(this.details.total.toFixed(2));
    },
    addProduct: function (item) {
        this.details.products.push(item);
        this.listProducts();
    },
    listProducts: function () {
        this.calculateInvoice();
        tblProducts = $('#tblProducts').DataTable({
            responsive: true,
            autoWidth: false,
            destroy: true,
            data: this.details.products,
            columns: [
                {"data": "id"},
                {"data": "full_name"},
                {"data": "expiration"},
                {"data": "cost"},
                {"data": "pvp"},
                {"data": "cant"},
                {"data": "subtotal"},
            ],
            columnDefs: [
                {
                    targets: [0],
                    visible: false
                },
                {
                    targets: '_all',
                    class: 'text-center',
                },
                {
                    targets: [1],
                    render: function (data, type, row) {
                        return '<a rel="remove" class="btn-xs" style="font-size: 14px; font-weight: bold">' + data + '</a>';
                    }
                },
                {
                    targets: [2],
                    render: function (data, type, row) {
                        return `<input  type="text" maxlength="10" name="expiration" data-target="#expiration" data-toggle="datetimepicker" autocomplete="off" id="expiration" class="form-control form-control-sm input-sm datetimepicker-input" value="${data}"/>`;
                    }
                },
                {
                    targets: [3],
                    orderable: false,
                    render: function (data, type, row) {
                        // return '$' + parseFloat(data).toFixed(2);
                        return '<input type="text" name="cost" class="form-control form-control-sm input-sm" autocomplete="off" value="' + parseFloat(data).toFixed(2) + '">';
                    }
                },
                {
                    targets: [4],
                    orderable: false,
                    render: function (data, type, row) {
                        return '<input type="text" name="pvp" class="form-control form-control-sm input-sm" autocomplete="off" value="' + parseFloat(data).toFixed(2) + '">';
                    }
                },
                {
                    targets: [5],
                    orderable: false,
                    render: function (data, type, row) {
                        return '<input type="text" name="cant" class="form-control form-control-sm input-sm" autocomplete="off" value="' + row.cant + '">';
                    }
                },
                {
                    targets: [6],
                    orderable: false,
                    render: function (data, type, row) {
                        return '$' + parseFloat(data).toFixed(2);
                        // return '<span type="text" id="subtotal">0.00</span>';
                    }
                },
            ],
            rowCallback(row, data, displayNum, displayIndex, dataIndex) {

                $(row).find('input[name="expiration"]').datetimepicker({
                    useCurrent: false,
                    format: 'YYYY-MM-DD',
                    locale: 'es',
                    keepOpen: false,
                    // maxDate: new Date()
                });
                $(row).find('input[name="cant"]').TouchSpin({
                    min: 1,
                    max: 1000000,
                    step: 1
                });
                $(row).find('input[name="cost"]').TouchSpin({
                    min: 0.01,
                    max: 1000000,
                    step: 0.01,
                    decimals: 2,
                    boostat: 5,
                    maxboostedstep: 10,
                });
                $(row).find('input[name="pvp"]').TouchSpin({
                    min: 0.01,
                    max: 1000000,
                    step: 0.01,
                    decimals: 2,
                    boostat: 5,
                    maxboostedstep: 10,
                });

            },
            initComplete: function (settings, json) {


            }
        });
    },
};

$(function () {

    select_supplier = $('select[name="supplier"]');
    select_search_product = $('select[name="search_product"]');

    $('.select2').select2({
        theme: "bootstrap4",
        language: 'es'
    });

    // Supplier

    select_supplier.select2({
        theme: "bootstrap4",
        language: 'es',
        allowClear: true,
        ajax: {
            delay: 250,
            type: 'POST',
            url: pathname,
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: function (params) {
                return {
                    term: params.term,
                    action: 'search_supplier'
                };
            },
            processResults: function (data) {
                return {
                    results: data
                };
            },
        },
        placeholder: 'Ingrese un nombre',
        minimumInputLength: 1,
    });

    // Event to open the model for create a new supplier
    $('.btnAddSupplier').on('click', function () {
        $('#myModalSupplier').modal('show');
    });


    $('#myModalSupplier').on('hidden.bs.modal', function (e) {
        $('#frmSupplier').trigger('reset');
    });

    // Event to open the modal to create a new product
    $('.btnCreateProduct').on('click', function () {
        $('#myModalCreateProduct').modal('show');
    });


    $('#myModalCreateProduct').on('hidden.bs.modal', function (e) {
        $('#frmCreateProduct').trigger('reset');
    });


    // Form to create a new Supplier
    $('#frmSupplier').on('submit', function (e) {
        e.preventDefault();
        var parameters = new FormData(this);
        parameters.append('action', 'create_supplier');
        submit_with_ajax(pathname, 'Notificación',
            '¿Estas seguro de crear al siguiente cliente?', parameters, function (response) {
                //console.log(response);
                var newOption = new Option(response.full_name, response.id, false, true);
                select_supplier.append(newOption).trigger('change');
                $('#myModalSupplier').modal('hide');

            });
    });

    // Event form to create a new Product
    $('#frmCreateProduct').on('submit', function (e) {
        e.preventDefault();
        var parameters = new FormData(this);
        parameters.append('action', 'create_new_product');
        submit_with_ajax(pathname, 'Notificación',
            '¿Estas seguro de crear al siguiente producto?', parameters, function (response) {
                //console.log(response);
                $('#myModalCreateProduct').modal('hide');
            });
    });

    select_search_product.select2({
        theme: "bootstrap4",
        language: 'es',
        allowClear: true,
        ajax: {
            delay: 250,
            type: 'POST',
            url: pathname,
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: function (params) {
                return {
                    term: params.term,
                    action: 'search_products_select2',
                    ids: JSON.stringify(sale.getProductsIds())
                };
            },
            processResults: function (data) {
                return {
                    results: data
                };
            },
        },
        placeholder: 'Ingrese una descripción',
        minimumInputLength: 1,
        templateResult: function (repo) {
            if (repo.loading) {
                return repo.text;
            }

            if (!Number.isInteger(repo.id)) {
                return repo.text;
            }

            var stock = repo.is_inventoried ? repo.stock : 'Sin stock';

            return $(
                '<div class="wrapper container">' +
                '<div class="row">' +
                // '<div class="col-lg-1">' +
                // '<img alt="" src="' + repo.image + '" class="img-fluid img-thumbnail d-block mx-auto rounded">' +
                // '</div>' +
                '<div class="col-lg-11 text-left shadow-sm">' +
                //'<br>' +
                '<p style="margin-bottom: 0;">' +
                '<b>Nombre:</b> ' + repo.full_name + '<br>' +
                '<b>Stock:</b> ' + stock + '<br>' +
                // '<b>PVPc:</b> <span class="badge badge-warning">$' + repo.pvpc + '</span>' +
                '</p>' +
                '</div>' +
                '</div>' +
                '</div>');
        },
    })
        .on('select2:select', function (e) {
            var data = e.params.data;
            if (!Number.isInteger(data.id)) {
                return false;
            }
            data.cant = 1;
            data.subtotal = 0.00;
            sale.addProduct(data);
            select_search_product.val('').trigger('change.select2');
        });

    $('#tblProducts tbody')
        .off()
        .on('click', 'a[rel="remove"]', function () {
            var tr = tblProducts.cell($(this).closest('td, li')).index();
            alert_action('Notificación', '¿Estas seguro de eliminar el producto de tu detalle?',
                function () {
                    sale.details.products.splice(tr.row, 1);
                    tblProducts.row(tr.row).remove().draw();
                    sale.calculateInvoice();
                }, function () {

                });
        })
        .on('change', 'input[name="pvp"]', function () {
            console.clear();
            var newPvp = $(this).val();
            var tr = tblProducts.cell($(this).closest('td, li')).index();
            sale.details.products[tr.row].pvp = newPvp;
            // sale.calculateInvoice();
            // $('td:last', tblProducts.row(tr.row).node()).html('C$' + sale.details.products[tr.row].subtotal.toFixed(2));
        })
        .on('change', 'input[name="cost"]', function () {
            console.clear();
            var cost = $(this).val();
            var tr = tblProducts.cell($(this).closest('td, li')).index();
            sale.details.products[tr.row].cost = cost;
            sale.calculateInvoice();
            $('td:last', tblProducts.row(tr.row).node()).html('C$' + sale.details.products[tr.row].subtotal.toFixed(2));
        })
        .on('change', 'input[name="cant"]', function () {
            console.clear();
            var cant = parseInt($(this).val());
            var tr = tblProducts.cell($(this).closest('td, li')).index();
            sale.details.products[tr.row].cant = cant;
            sale.calculateInvoice();
            $('td:last', tblProducts.row(tr.row).node()).html('C$' + sale.details.products[tr.row].subtotal.toFixed(2));
        });

    $('.btnRemoveAll').on('click', function () {
        if (sale.details.products.length === 0) return false;
        alert_action('Notificación', '¿Estas seguro de eliminar todos los details de tu detalle?', function () {
            sale.details.products = [];
            sale.listProducts();
        }, function () {

        });
    });

    $('.btnClearSearch').on('click', function () {
        select_search_product.val('').focus();
    });

    $('.btnSearchProducts').on('click', function () {
        tblSearchProducts = $('#tblSearchProducts').DataTable({
            responsive: true,
            autoWidth: false,
            destroy: true,
            deferRender: true,
            ajax: {
                url: pathname,
                type: 'POST',
                data: {
                    'action': 'search_products',
                    'ids': JSON.stringify(sale.getProductsIds()),
                    'term': select_search_product.val()
                },
                dataSrc: "",
                headers: {
                    'X-CSRFToken': csrftoken
                },
            },
            columns: [
                {"data": "full_name"},
                {"data": "image"},
                {"data": "stock"},
                {"data": "cost"},
                {"data": "id"},
            ],
            columnDefs: [
                {
                    targets: [-4],
                    class: 'text-center',
                    orderable: false,
                    render: function (data, type, row) {
                        return '<img src="' + data + '" class="img-fluid d-block mx-auto" style="width: 20px; height: 20px;">';
                    }
                },
                {
                    targets: [-3],
                    class: 'text-center',
                    render: function (data, type, row) {
                        if (!row.is_inventoried) {
                            return '<span class="badge badge-secondary">Sin stock</span>';
                        }
                        return '<span class="badge badge-secondary">' + data + '</span>';
                    }
                },
                {
                    targets: [-2],
                    class: 'text-center',
                    orderable: false,
                    render: function (data, type, row) {
                        return '$' + parseFloat(data).toFixed(2);
                    }
                },
                {
                    targets: [-1],
                    class: 'text-center',
                    orderable: false,
                    render: function (data, type, row) {
                        var buttons = '<a rel="add" class="btn btn-success btn-xs btn-flat"><i class="fas fa-plus"></i></a> ';
                        return buttons;
                    }
                },
            ],
            initComplete: function (settings, json) {

            }
        });
        $('#myModalSearchProducts').modal('show');
    });

    $('#tblSearchProducts tbody')
        .off()
        .on('click', 'a[rel="add"]', function () {
            var tr = tblSearchProducts.cell($(this).closest('td, li')).index();
            var product = tblSearchProducts.row(tr.row).data();
            product.cant = 1;
            product.subtotal = 0.00;
            sale.addProduct(product);
            tblSearchProducts.row($(this).parents('tr')).remove().draw();
        });

    // Form Sale

    // $("input[name='iva']").TouchSpin({
    //     min: 0,
    //     max: 100,
    //     step: 0.01,
    //     decimals: 2,
    //     boostat: 5,
    //     maxboostedstep: 10,
    //     postfix: '%'
    // }).on('change', function () {
    //     sale.calculateInvoice();
    // }).val(0.15);


    $('#frmSale').on('submit', function (e) {
        e.preventDefault();

        if (sale.details.products.length === 0) {
            message_error('Debe al menos tener un item en su detalle en su compra');
            return false;
        }

        var success_url = this.getAttribute('data-url');
        var parameters = new FormData(this);
        parameters.append('products', JSON.stringify(sale.details.products));
        parameters.append('products_review', JSON.stringify(sale.details.products_review));
        submit_with_ajax(pathname, 'Notificación',
            '¿Estas seguro de realizar la siguiente acción?', parameters, function (response) {
                location.href = success_url;
            });
    });

    sale.listProducts();
});

