export const MARKET_CATEGORIES = [
  {
    id: 'frutas', name: 'Frutas', icon: '🍎', items: [
      ['aguaymanto','Aguaymanto','KG'],['arandano','Arándano','KG'],['fresa','Fresa grande','KG'],['mandarina','Mandarina','KG'],['mango','Mango Edward','KG'],['manzana','Manzana verde','KG'],['maracuya','Maracuyá','KG'],['melon','Melón','UND'],['papaya','Papaya','UND'],['pina','Piña Golden','UND'],['pitahaya','Pitahaya','UND'],['platano','Plátano de seda','KG'],['uva','Uva verde','KG']
    ]
  },
  {
    id: 'verduras', name: 'Verduras', icon: '🥦', items: [
      ['aceituna','Aceituna morada','KG'],['aji_limo_rojo','Ají limo rojo','KG'],['aji_limo_verde','Ají limo verde','KG'],['ajo','Ajo pelado','KG'],['beterraga','Beterraga','KG'],['brocoli','Brócoli','KG'],['caigua','Caigua','KG'],['camote','Camote','KG'],['cebolla_blanca','Cebolla blanca','KG'],['cebolla_roja','Cebolla roja','KG'],['cebolla_china','Cebolla china','ATD'],['choclo','Choclo desgranado','KG'],['aji_escabeche','Ají escabeche cristal','KG'],['esparrago','Espárragos verdes','ATD'],['frijol','Frijol no nacido','KG'],['germinado','Germinado','PQT'],['kion','Kion','KG'],['limon','Limón','KG'],['palta','Paltas fuertes','UND'],['papa_amarilla','Papa amarilla','KG'],['papa_coctel','Papa cóctel','KG'],['pepinillo','Pepinillos','UND'],['pimiento','Pimientos rojos','KG'],['platano_freir','Plátanos para freír','UND'],['rabano','Rábano','KG'],['rocoto','Rocoto','UND'],['tomate_rojo','Tomate rojo','KG'],['tomate_cherry','Tomate cherry','PQT'],['vainita','Vainita','KG'],['zanahoria','Zanahoria','KG'],['zapallo','Zapallo macre','KG']
    ]
  },
  {
    id: 'hierbas', name: 'Hierbas', icon: '🌿', items: [
      ['aji_panca','Ají panca rojo','KG'],['albahaca','Albahaca','ATD'],['apio','Apio','ATD'],['culantro','Culantro','ATD'],['espinaca','Espinaca','KG'],['huacatay','Huacatay','KG'],['holantao','Holantao','KG'],['perejil','Perejil','ATD'],['poro','Poro','ATD']
    ]
  },
  {
    id: 'abarrotes', name: 'Abarrotes y frutos secos', icon: '🥜', items: [
      ['ajonjoli_blanco','Ajonjolí blanco','KG'],['ajonjoli_negro','Ajonjolí negro','KG'],['almendra','Almendra','KG'],['arandano_desh','Arándano deshidratado','KG'],['canela','Canela en polvo','KG'],['clavo','Clavo de olor','KG'],['comino','Comino','KG'],['chia','Chía','KG'],['garbanzo','Garbanzo','KG'],['lenteja','Lenteja serrana','KG'],['oregano_polvo','Orégano en polvo','KG'],['oregano_entero','Orégano entero','KG'],['pimienta','Pimienta','KG'],['quinua_roja','Quinua roja','KG'],['quinua_negra','Quinua negra','KG'],['quinua_blanca','Quinua blanca','KG'],['hongos','Hongos secos','KG'],['chuno','Chuño','KG'],['romero','Romero','KG'],['sal_ajo','Sal de ajo','KG']
    ]
  },
  {
    id: 'lechugas', name: 'Lechugas', icon: '🥬', items: [
      ['lechuga_verde','Lechuga verde','UND'],['lechuga_morada','Lechuga morada','UND']
    ]
  }
]

export const PROTEINS = [
  ['pollo_super_150','Pollo super 150gr',['s pollo','super pollo','pollo super']],
  ['pollo_regular_100','Pollo regular 100gr',['r pollo','regular pollo','pollo regular']],
  ['pollo_chaufa_100','Pollo chaufa 100gr',['p chaufa','pchaufa','pollo chaufa']],
  ['pollo_deshilachado_50','Pollo deshilachado 50gr',['p deshilachado','pollo deshilachado']],
  ['pollo_enrollado_120','Pollo enrollado 120gr',['e pollo','enrollado pollo']],
  ['bistec_super_150','Bistec super 150gr',['b super','bistec super']],
  ['bistec_regular_100','Bistec regular 100gr',['b regular','bistec regular']],
  ['enrollado_carne_120','Enrollado de carne 120gr',['e carne','enrollado carne']],
  ['hamb_carne','Hamburguesa de carne',['h carne','hamburguesa carne']],
  ['hamb_quinoa_100','Hamburguesa de quinua 100gr',['h quinua 100','hamburguesa quinua 100']],
  ['hamb_quinoa_150','Hamburguesa de quinua 150gr',['h quinua 150','hamburguesa quinua 150']],
  ['hamb_anchoveta_150','Hamburguesa de Anchoveta 150gr',['h anchoveta 150','hamburguesa anchoveta 150']],
  ['hamb_anchoveta_100','Hamburguesa de Anchoveta 100gr',['h anchoveta 100','hamburguesa anchoveta 100']],
  ['wrap_90','Masa de wraps 90 gr',['wrap','wraps']],
  ['burrito_120','Masa de burritos 120gr',['burrito','burritos']],
  ['lomo_fino','Lomo fino',['lomo fino']]
].map(([id,name,aliases]) => ({id,name,aliases,unit:'UND'}))

export const ALL_PRODUCTS = [
  ...MARKET_CATEGORIES.flatMap(c => c.items.map(([id,name,unit]) => ({id:`market_${id}`,name,unit,category:c.name,type:'market'}))),
  ...PROTEINS.map(p => ({...p,category:'Proteínas',type:'protein'}))
]
