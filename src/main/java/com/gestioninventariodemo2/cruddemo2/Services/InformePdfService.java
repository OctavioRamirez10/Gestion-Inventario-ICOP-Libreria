package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.*;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.events.IEventHandler;
import com.itextpdf.kernel.events.Event;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class InformePdfService {

        private final InformeService informeService;

        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        private static final DecimalFormat NUMBER_FORMATTER;

        private static final DeviceRgb BRAND_COLOR = new DeviceRgb(41, 98, 255); // Azul Índigo
        private static final DeviceRgb TEXT_DARK = new DeviceRgb(55, 65, 81); // Gris Oscuro
        private static final DeviceRgb TEXT_MUTED = new DeviceRgb(107, 114, 128); // Gris Claro
        private static final DeviceRgb ROW_EVEN = new DeviceRgb(249, 250, 251); // Zebra striping sutil
        private static final DeviceRgb BORDER_COLOR = new DeviceRgb(229, 231, 235); // Gris para bordes

        static {
                DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("es", "AR"));
                symbols.setGroupingSeparator('.');
                symbols.setDecimalSeparator(',');
                NUMBER_FORMATTER = new DecimalFormat("#,##0", symbols);
        }

        public byte[] generarPdfInformeCompleto(LocalDate inicio, LocalDate fin) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();

                try {
                        PdfWriter writer = new PdfWriter(baos);
                        PdfDocument pdf = new PdfDocument(writer);
                        Document document = new Document(pdf, PageSize.A4);
                        document.setMargins(40, 40, 60, 40);
                        pdf.addEventHandler(PdfDocumentEvent.END_PAGE, new PageEvent());

                        // ========== CABECERA ==========
                        agregarCabecera(document, inicio, fin);

                        // ========== KPIs ==========
                        KPIsDTO kpis = informeService.obtenerKPIs(inicio, fin);
                        ResumenStockDTO resumenStock = informeService.obtenerResumenStock();
                        agregarSeccionKPIs(document, kpis, resumenStock);

                        // ========== TOP 5 PRODUCTOS MÁS VENDIDOS ==========
                        List<TopProductoDTO> topVendidos = informeService.obtenerTopProductos(inicio, fin, 5);
                        agregarSeccionTopVendidos(document, topVendidos);

                        // ========== TOP 5 PRODUCTOS MÁS COMPRADOS ==========
                        List<TopProductoDTO> topComprados = informeService.obtenerTopProductosComprados(inicio, fin, 5);
                        agregarSeccionTopComprados(document, topComprados);

                        document.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        throw new RuntimeException("Error al generar PDF de informe completo", e);
                }
        }

        private void agregarCabecera(Document document, LocalDate inicio, LocalDate fin) {
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
            headerTable.setMarginBottom(15);

            Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);
            leftCell.add(new Paragraph("SGI").setBold().setFontSize(24).setFontColor(BRAND_COLOR).setMarginBottom(0));
            leftCell.add(new Paragraph("Informe Global").setBold().setFontSize(14).setFontColor(TEXT_DARK).setMarginBottom(0));
            leftCell.add(new Paragraph("Sistema de Gestión de Inventario").setFontSize(9).setFontColor(TEXT_MUTED));

            Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.BOTTOM).setTextAlignment(TextAlignment.RIGHT);
            
            String fechaHora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            rightCell.add(new Paragraph("Generado el: " + fechaHora).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
            
            String periodoTexto = (inicio != null && fin != null)
                    ? inicio.format(DATE_FORMATTER) + " - " + fin.format(DATE_FORMATTER)
                    : "Histórico completo";
            rightCell.add(new Paragraph("Período: " + periodoTexto).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));

            headerTable.addCell(leftCell);
            headerTable.addCell(rightCell);
            document.add(headerTable);

            Table lineTable = new Table(1).useAllAvailableWidth();
            lineTable.addCell(new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(BRAND_COLOR, 2f)));
            lineTable.setMarginBottom(20);
            document.add(lineTable);
        }

        private void agregarSeccionKPIs(Document document, KPIsDTO kpis, ResumenStockDTO stock) {
            Paragraph tituloKPIs = new Paragraph("Resumen Ejecutivo - Flujo de Caja")
                    .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginTop(10).setMarginBottom(10).setKeepWithNext(true);
            document.add(tituloKPIs);

            // Flujo de Caja
            Table kpisTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1, 1, 1 }))
                    .useAllAvailableWidth().setMarginBottom(20);

            kpisTable.addCell(crearTarjetaResumen("Ingresos (Ventas)", "$" + formatCurrency(kpis.getTotalVentas() != null ? kpis.getTotalVentas() : 0), BRAND_COLOR));
            kpisTable.addCell(crearTarjetaResumen("Inversión (Compras)", "$" + formatCurrency(kpis.getTotalCompras() != null ? kpis.getTotalCompras() : 0), TEXT_DARK));
            
            double gananciaReal = kpis.getGananciaReal() != null ? kpis.getGananciaReal() : 0;
            DeviceRgb colorGanancia = gananciaReal >= 0 ? new DeviceRgb(40, 167, 69) : new DeviceRgb(220, 53, 69);
            kpisTable.addCell(crearTarjetaResumen("Ganancia Real", "$" + formatCurrency(gananciaReal), colorGanancia));

            double cajaReal = kpis.getFlujoCajaLibre() != null ? kpis.getFlujoCajaLibre() : 0;
            DeviceRgb colorCaja = cajaReal >= 0 ? new DeviceRgb(41, 98, 255) : new DeviceRgb(220, 53, 69);
            kpisTable.addCell(crearTarjetaResumen("Efectivo Neto", "$" + formatCurrency(cajaReal), colorCaja));

            document.add(kpisTable);

            // Inventario
            Paragraph tituloStock = new Paragraph("Salud del Inventario")
                    .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginTop(10).setMarginBottom(10).setKeepWithNext(true);
            document.add(tituloStock);

            Table stockTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1, 1, 1 }))
                    .useAllAvailableWidth().setMarginBottom(30);

            long total = stock != null ? stock.getTotalProductos() : 0;
            long agotados = stock != null ? stock.getProductosAgotados() : 0;
            DeviceRgb colorAgotados = agotados > 0 ? new DeviceRgb(220, 53, 69) : TEXT_DARK;

            long bajoStock = kpis.getProductosStockBajo() != null ? kpis.getProductosStockBajo() : 0;
            DeviceRgb colorBajoStock = bajoStock > 0 ? new DeviceRgb(255, 140, 0) : TEXT_DARK;

            long optimos = total - agotados - bajoStock;
            if (optimos < 0) optimos = 0;
            DeviceRgb colorOptimos = new DeviceRgb(40, 167, 69); // Verde

            stockTable.addCell(crearTarjetaResumen("Total en Catálogo", String.valueOf(total), BRAND_COLOR));
            stockTable.addCell(crearTarjetaResumen("Stock Óptimo", String.valueOf(optimos), colorOptimos));
            stockTable.addCell(crearTarjetaResumen("Stock Bajo", String.valueOf(bajoStock), colorBajoStock));
            stockTable.addCell(crearTarjetaResumen("Agotados", String.valueOf(agotados), colorAgotados));

            document.add(stockTable);
        }

        private Cell crearTarjetaResumen(String titulo, String valor, DeviceRgb valorColor) {
            return new Cell().setBorder(Border.NO_BORDER).setPadding(5)
                    .add(new Paragraph(titulo).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2))
                    .add(new Paragraph(valor).setFontSize(14).setBold().setFontColor(valorColor));
        }

        private void agregarSeccionTopVendidos(Document document, List<TopProductoDTO> topVendidos) {
            Paragraph titulo = new Paragraph("Top 5 Productos Más Vendidos")
                    .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginBottom(10).setMarginTop(10).setKeepWithNext(true);
            document.add(titulo);

            Table table = new Table(UnitValue.createPercentArray(new float[] { 1, 4, 2, 2 })).useAllAvailableWidth().setMarginBottom(20);

            table.addHeaderCell(crearCabeceraCelda("#", TextAlignment.CENTER));
            table.addHeaderCell(crearCabeceraCelda("Producto", TextAlignment.CENTER));
            table.addHeaderCell(crearCabeceraCelda("Cantidades", TextAlignment.CENTER));
            table.addHeaderCell(crearCabeceraCelda("Ingresos Generados", TextAlignment.CENTER));

            if (topVendidos.isEmpty()) {
                table.addCell(new Cell(1, 4).add(new Paragraph("No hay datos en este período").setTextAlignment(TextAlignment.CENTER)).setBorder(Border.NO_BORDER).setPadding(10));
            } else {
                int posicion = 1;
                boolean isEven = false;
                for (TopProductoDTO producto : topVendidos) {
                    DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
                    isEven = !isEven;

                    table.addCell(crearCeldaDato(String.valueOf(posicion++), rowBg, TextAlignment.CENTER));
                    table.addCell(crearCeldaDato(producto.getNombreProducto(), rowBg, TextAlignment.LEFT));
                    table.addCell(crearCeldaDato(String.valueOf(producto.getCantidad()), rowBg, TextAlignment.CENTER));
                    table.addCell(crearCeldaDato("$" + formatCurrency(producto.getTotalVentas()), rowBg, TextAlignment.RIGHT));
                }
            }
            document.add(table);
        }

        private void agregarSeccionTopComprados(Document document, List<TopProductoDTO> topComprados) {
            Paragraph titulo = new Paragraph("Top 5 Productos Más Comprados")
                    .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginBottom(10).setMarginTop(10).setKeepWithNext(true);
            document.add(titulo);

            Table table = new Table(UnitValue.createPercentArray(new float[] { 1, 4, 2, 2 })).useAllAvailableWidth().setMarginBottom(20);

            table.addHeaderCell(crearCabeceraCelda("#", TextAlignment.CENTER));
            table.addHeaderCell(crearCabeceraCelda("Producto", TextAlignment.CENTER));
            table.addHeaderCell(crearCabeceraCelda("Cantidades", TextAlignment.CENTER));
            table.addHeaderCell(crearCabeceraCelda("Inversión", TextAlignment.CENTER));

            if (topComprados.isEmpty()) {
                table.addCell(new Cell(1, 4).add(new Paragraph("No hay datos en este período").setTextAlignment(TextAlignment.CENTER)).setBorder(Border.NO_BORDER).setPadding(10));
            } else {
                int posicion = 1;
                boolean isEven = false;
                for (TopProductoDTO producto : topComprados) {
                    DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
                    isEven = !isEven;

                    table.addCell(crearCeldaDato(String.valueOf(posicion++), rowBg, TextAlignment.CENTER));
                    table.addCell(crearCeldaDato(producto.getNombreProducto(), rowBg, TextAlignment.LEFT));
                    table.addCell(crearCeldaDato(String.valueOf(producto.getCantidad()), rowBg, TextAlignment.CENTER));
                    table.addCell(crearCeldaDato("$" + formatCurrency(producto.getTotalVentas()), rowBg, TextAlignment.RIGHT));
                }
            }
            document.add(table);
        }

        private Cell crearCabeceraCelda(String text, TextAlignment alignment) {
            return new Cell()
                    .add(new Paragraph(text).setBold().setFontSize(9))
                    .setBackgroundColor(BRAND_COLOR)
                    .setFontColor(ColorConstants.WHITE)
                    .setBorder(Border.NO_BORDER)
                    .setTextAlignment(alignment)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setPadding(6);
        }

        private Cell crearCeldaDato(String text, DeviceRgb bgColor, TextAlignment alignment) {
            return new Cell().setKeepTogether(true)
                    .add(new Paragraph(text).setFontSize(8).setFontColor(TEXT_DARK))
                    .setBackgroundColor(bgColor)
                    .setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f))
                    .setTextAlignment(alignment)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setPadding(5);
        }

        private static class PageEvent implements IEventHandler {
            @Override
            public void handleEvent(Event event) {
                PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
                PdfDocument pdfDoc = docEvent.getDocument();
                PdfPage page = docEvent.getPage();
                int pageNumber = pdfDoc.getPageNumber(page);
                Rectangle pageSize = page.getPageSize();
                
                PdfCanvas canvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdfDoc);
                
                canvas.setStrokeColor(BORDER_COLOR)
                      .setLineWidth(0.5f)
                      .moveTo(40, 35)
                      .lineTo(pageSize.getWidth() - 40, 35)
                      .stroke();

                Paragraph footerText = new Paragraph("Informe Global - Sistema de Gestión de Inventario")
                        .setFontSize(7)
                        .setFontColor(TEXT_MUTED);
                
                Paragraph pageNumberParagraph = new Paragraph("Página " + pageNumber)
                        .setFontSize(7)
                        .setFontColor(TEXT_MUTED);
                
                com.itextpdf.layout.Canvas htmlCanvas = new com.itextpdf.layout.Canvas(canvas, new Rectangle(40, 15, pageSize.getWidth() - 80, 20));
                htmlCanvas.showTextAligned(footerText, 40, 15, TextAlignment.LEFT);
                htmlCanvas.showTextAligned(pageNumberParagraph, pageSize.getWidth() - 40, 15, TextAlignment.RIGHT);
                htmlCanvas.close();
            }
        }

        private String formatCurrency(double amount) {
                return NUMBER_FORMATTER.format(amount);
        }
}
