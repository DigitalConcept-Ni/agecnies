import json

from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.urls import reverse_lazy
from django.views.generic import CreateView, FormView, UpdateView
# os.add_dll_directory(r"C:\Program Files\GTK3-Runtime Win64\bin")

from core.pos.forms import ShoppingForm, SupplierForm, ProductForm
from core.pos.mixins import ValidatePermissionRequiredMixin, ExistsCompanyMixin
from core.pos.models import Product, Shopping, Supplier, ShoppingDetail
from core.reports.forms import ReportForm


class ShoppingListView(ValidatePermissionRequiredMixin, FormView):
    form_class = ReportForm
    template_name = 'shopping/list.html'
    permission_required = 'view_shopping'

    def post(self, request, *args, **kwargs):
        data = {}
        try:
            action = request.POST['action']
            if action == 'search':
                data = []
                start_date = request.POST['start_date']
                end_date = request.POST['end_date']
                queryset = Shopping.objects.select_related()
                if len(start_date) and len(end_date):
                    queryset = queryset.filter(date_joined__range=[start_date, end_date])
                for i in queryset:
                    data.append(i.toLIST())
            elif action == 'delete':
                sho = Shopping.objects.get(id=request.POST['id'])
                for s in sho.shoppingdetail_set.all():
                    s.product.stock -= s.cant
                    s.product.save()
                sho.delete()
            elif action == 'search_invoice_number':
                data = []
                queryset = Shopping.objects.all()
                queryset = queryset.filter(invoice_number=request.POST['invoice'])
                data = [i.toJSON() for i in queryset]
                # data.append(queryset.toJSON())
            elif action == 'search_products_detail':
                data = []
                for i in ShoppingDetail.objects.filter(shopping_id=request.POST['id']):
                    data.append(i.toJSON())
            else:
                data['error'] = 'Ha ocurrido un error'
        except Exception as e:
            print(e)
            data['error'] = str(e)
        return JsonResponse(data, safe=False)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Listado de Compras'
        context['create_url'] = reverse_lazy('shopping_create')
        context['list_url'] = reverse_lazy('shopping_list')
        context['entity'] = 'Compras'
        return context


class ShoppingCreateView(ExistsCompanyMixin, ValidatePermissionRequiredMixin, CreateView):
    model = Shopping
    form_class = ShoppingForm
    template_name = 'shopping/create.html'
    success_url = reverse_lazy('shopping_list')
    url_redirect = success_url
    permission_required = 'add_shopping'

    def post(self, request, *args, **kwargs):
        data = {}
        try:
            action = request.POST['action']
            if action == 'search_products':
                data = []
                ids_exclude = json.loads(request.POST['ids'])
                term = request.POST['term'].strip()
                products = Product.objects.filter(Q(stock__gt=0) | Q(is_inventoried=False))
                if len(term):
                    products = products.filter(name__icontains=term)
                for i in products.exclude(id__in=ids_exclude)[0:10]:
                    item = i.toJSON()
                    item['value'] = i.__str__()
                    data.append(item)
            elif action == 'search_products_select2':
                data = []
                ids_exclude = json.loads(request.POST['ids'])
                term = request.POST['term'].strip()
                data.append({'id': term, 'text': term})
                # products = Product.objects.filter(name__icontains=term).filter(Q(stock__gt=0) | Q(is_inventoried=False))
                products = Product.objects.filter(Q(name__icontains=term) | Q(code__icontains=term))
                for i in products:
                    item = i.toJSON()
                    item['text'] = i.__str__()
                    data.append(item)
            elif action == 'add':
                with transaction.atomic():
                    # Json donde recolectamos los productos insertados por el usuario
                    products = json.loads(request.POST['products'])

                    shopping = Shopping()
                    shopping.supplier_id = int(request.POST['supplier'])
                    shopping.user_id = request.user.id
                    shopping.invoice_number = request.POST['invoice_number']
                    shopping.date_joined = request.POST['date_joined']
                    shopping.discount = float(request.POST['discount'])
                    shopping.iva = float(request.POST['iva'])
                    shopping.income_tax = float(request.POST['income_tax'])
                    shopping.city_tax = float(request.POST['city_tax'])
                    shopping.save()

                    # shopping = Shopping()
                    # shopping.supplier_id = int(request.POST['supplier'])
                    # shopping.user_id = request.POST['user_id']
                    # shopping.invoice_number = request.POST['invoice_number']
                    # shopping.date_joined = request.POST['date_joined']
                    # shopping.iva = float(request.POST['iva'])
                    # shopping.save()

                    cantItemsShopping = 0
                    for i in products:
                        # print(i)
                        # print(i['expiration'])
                        detail = ShoppingDetail()
                        detail.shopping_id = shopping.id
                        detail.product_id = int(i['id'])
                        detail.cant = int(i['cant'])
                        detail.available = int(i['cant'])
                        detail.price = float(i['cost'])
                        detail.subtotal = detail.cant * detail.price
                        detail.save()
                        if not detail.product.is_inventoried:
                            detail.product.is_inventoried = True
                        if detail.product.is_inventoried:
                            detail.product.stock += detail.cant
                            detail.product.cost = float(i['cost'])
                            detail.product.pvp = float(i['pvp'])
                            detail.product.expiration = i['expiration']
                            detail.product.save()
                        cantItemsShopping += 1

                    shopping.cant = + int(cantItemsShopping)
                    shopping.save()
                    shopping.calculate_invoice()
                    data = {'id': shopping.id}
            elif action == 'search_supplier':
                data = []
                term = request.POST['term']
                clients = Supplier.objects.filter(
                    Q(name__icontains=term) | Q(responsible__icontains=term))[0:10]
                for i in clients:
                    item = i.toJSON()
                    item['text'] = i.get_full_name()
                    data.append(item)
            elif action == 'create_supplier':
                with transaction.atomic():
                    form = SupplierForm(request.POST)
                    data = form.save()
            elif action == 'create_new_product':
                with transaction.atomic():
                    form = ProductForm(request.POST)
                    data = form.save()
            else:
                data['error'] = 'No ha ingresado a ninguna opción'
        except Exception as e:
            print(str(e))
            data['error'] = str(e)
        return JsonResponse(data, safe=False)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Creación de una compra'
        context['entity'] = 'Compras'
        context['list_url'] = self.success_url
        context['action'] = 'add'
        context['products'] = []
        context['frmSupplier'] = SupplierForm()
        context['frmProduct'] = ProductForm()
        return context


class ShoppingUpdateView(ExistsCompanyMixin, ValidatePermissionRequiredMixin, UpdateView):
    model = Shopping
    form_class = ShoppingForm
    template_name = 'shopping/create.html'
    success_url = reverse_lazy('shopping_list')
    url_redirect = success_url
    permission_required = 'change_shopping'

    def get_form(self, form_class=None):
        instance = self.get_object()
        form = ShoppingForm(instance=instance)
        form.fields['supplier'].queryset = Supplier.objects.filter(id=instance.supplier.id)
        return form

    def get_details_product(self):
        data = []
        shopping = self.get_object()
        for i in shopping.shoppingdetail_set.all():
            item = i.product.toJSON()
            item['cant'] = i.cant
            data.append(item)
        return json.dumps(data)

    def post(self, request, *args, **kwargs):
        data = {}
        try:
            action = request.POST['action']
            if action == 'search_products':
                data = []
                ids_exclude = json.loads(request.POST['ids'])
                term = request.POST['term'].strip()
                products = Product.objects.filter(Q(stock__gt=0) | Q(is_inventoried=False))
                if len(term):
                    products = products.filter(name__icontains=term)
                for i in products.exclude(id__in=ids_exclude)[0:10]:
                    item = i.toJSON()
                    item['value'] = i.__str__()
                    data.append(item)
            elif action == 'search_products_select2':
                data = []
                ids_exclude = json.loads(request.POST['ids'])
                term = request.POST['term'].strip()
                data.append({'id': term, 'text': term})
                # products = Product.objects.filter(name__icontains=term).filter(Q(stock__gt=0) | Q(is_inventoried=False))
                products = Product.objects.filter(name__icontains=term)
                for i in products:
                    item = i.toJSON()
                    item['text'] = i.__str__()
                    data.append(item)
            elif action == 'edit':
                with transaction.atomic():
                    # Json donde optenemos los productos insertados por el usuario
                    products = json.loads(request.POST['products'])
                    products_review = json.loads(request.POST['products_review'])

                    shopping = self.get_object()
                    shopping.supplier_id = int(request.POST['supplier'])
                    shopping.invoice_number = request.POST['invoice_number']
                    shopping.discount = float(request.POST['discount'])
                    shopping.iva = float(request.POST['iva'])
                    shopping.income_tax = float(request.POST['income_tax'])
                    shopping.city_tax = float(request.POST['city_tax'])
                    shopping.save()

                    shopping.shoppingdetail_set.all().delete()
                    cantItemsShopping = 0
                    listProductId = []  # Lista que obtendra los id de los productos ingresados

                    pr = [pr.get('id') for pr in products_review]

                    # Bloque para agregar el detalle de la compra a la tabla Shoopingdetails
                    for p in products:
                        detail = ShoppingDetail()
                        detail.shopping_id = shopping.id
                        detail.product_id = int(p['id'])
                        detail.cant = int(p['cant'])
                        detail.price = float(p['cost'])
                        detail.subtotal = detail.cant * detail.price
                        detail.save()
                        if detail.product.is_inventoried:
                            if p['id'] in pr:
                                indice = pr.index(p['id'])
                                detail.product.stock = (detail.product.stock - products_review[indice]['cant']) + \
                                                       p['cant']
                                detail.product.cost = float(p['cost'])
                                detail.product.pvp = float(p['pvp'])
                                detail.product.expiration = p['expiration']
                                detail.product.save()
                            else:
                                detail.product.stock += p['cant']
                                detail.product.cost = float(p['cost'])
                                detail.product.pvp = float(p['pvp'])
                                detail.product.expiration = p['expiration']
                                detail.product.save()
                        listProductId.append(p['id'])
                        cantItemsShopping += 1

                    # Ciclo para retroceder los cambios de los productos que fueron mal digitados
                    if len(pr) != 0:
                        for i in pr:
                            print(i)
                            if i not in listProductId:
                                indice = pr.index(i)
                                detail.product_id = int(i)
                                detail.product.stock = detail.product.stock - products_review[indice]['cant']
                                detail.product.cost = float(products_review[indice]['cost'])
                                detail.product.pvp = float(products_review[indice]['pvp'])
                                detail.product.save()

                    shopping.cant = int(cantItemsShopping)
                    shopping.save()
                    shopping.calculate_invoice()
                    data = {'id': shopping.id}
            elif action == 'search_supplier':
                data = []
                term = request.POST['term']
                supplier = Supplier.objects.filter(
                    Q(name__icontains=term) | Q(responsible__icontains=term))[0:10]
                for i in supplier:
                    item = i.toJSON()
                    item['text'] = i.get_full_name()
                    data.append(item)
            elif action == 'create_supplier':
                with transaction.atomic():
                    form = SupplierForm(request.POST)
                    data = form.save()
            else:
                data['error'] = 'No ha ingresado a ninguna opción'
        except Exception as e:
            data['error'] = str(e)
        return JsonResponse(data, safe=False)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Edición de una Compra'
        context['entity'] = 'Compras'
        context['list_url'] = self.success_url
        context['action'] = 'edit'
        context['products'] = self.get_details_product()
        context['frmSupplier'] = SupplierForm()
        return context

# class SaleInvoicePdfView(LoginRequiredMixin, View):
#
#     def get(self, request, *args, **kwargs):
#         try:
#             template = get_template('sale/invoice.html')
#             context = {
#                 'sale': Sale.objects.get(pk=self.kwargs['pk']),
#                 'icon': f'{settings.MEDIA_URL}logo.png'
#             }
#             html = template.render(context)
#             css_url = os.path.join(settings.BASE_DIR, 'static/lib/bootstrap-4.6.0/css/bootstrap.min.css')
#             pdf = HTML(string=html, base_url=request.build_absolute_uri()).write_pdf(stylesheets=[CSS(css_url)])
#             return HttpResponse(pdf, content_type='application/pdf')
#         except:
#             pass
#         return HttpResponseRedirect(reverse_lazy('sale_list'))
