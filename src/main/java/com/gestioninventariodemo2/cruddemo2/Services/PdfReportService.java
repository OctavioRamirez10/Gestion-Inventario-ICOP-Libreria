package com.gestioninventariodemo2.cruddemo2.Services;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoInventarioDTO;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.events.Event;
import com.itextpdf.kernel.events.IEventHandler;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

@Service
public class PdfReportService {

    // Definición de colores de la marca
    private static final DeviceRgb BRAND_COLOR = new DeviceRgb(41, 98, 255); // Azul Índigo
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(55, 65, 81); // Gris Oscuro
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(107, 114, 128); // Gris Claro
    private static final DeviceRgb ROW_EVEN = new DeviceRgb(249, 250, 251); // Zebra striping sutil
    private static final DeviceRgb ALERT_RED = new DeviceRgb(220, 38, 38); // Rojo intenso
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(229, 231, 235); // Gris para bordes

    private static final DecimalFormat NUMBER_FORMATTER;

    static {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("es", "AR"));
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        NUMBER_FORMATTER = new DecimalFormat("#,##0", symbols);
    }

    public byte[] generarReporteInventarioPdf(List<ProductoInventarioDTO> productos, String filtrosAplicados, String sortDescripcion) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);
            document.setMargins(40, 40, 60, 40); // Ajuste de márgenes
            pdf.addEventHandler(PdfDocumentEvent.END_PAGE, new PageEvent());

            // --- 1. CABECERA A DOS COLUMNAS ---
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
            headerTable.setMarginBottom(15);

            // Columna Izquierda: Logo y Título
            Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);
            
            // "Logo" Tipográfico - SGI (Sistema de Gestión de Inventario)
            Paragraph logo = new Paragraph("SGI")
                    .setBold().setFontSize(24)
                    .setFontColor(BRAND_COLOR)
                    .setMarginBottom(0);
            
            Paragraph title = new Paragraph("Reporte de Inventario")
                    .setBold().setFontSize(14)
                    .setFontColor(TEXT_DARK)
                    .setMarginBottom(0);
                    
            Paragraph subtitle = new Paragraph("Sistema de Gestión Integrado")
                    .setFontSize(9)
                    .setFontColor(TEXT_MUTED);

            leftCell.add(logo).add(title).add(subtitle);

            // Columna Derecha: Metadatos
            Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.BOTTOM).setTextAlignment(TextAlignment.RIGHT);
            
            String fechaHora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            rightCell.add(new Paragraph("Generado el: " + fechaHora).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
            
            String textoFiltros = (filtrosAplicados == null || filtrosAplicados.isBlank()) ? "Todos" : filtrosAplicados;
            rightCell.add(new Paragraph("Filtros: " + textoFiltros).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));

            if (sortDescripcion != null && !sortDescripcion.isBlank()) {
                rightCell.add(new Paragraph("Orden: " + sortDescripcion).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
            }

            headerTable.addCell(leftCell);
            headerTable.addCell(rightCell);
            document.add(headerTable);

            // Línea divisoria elegante
            Table lineTable = new Table(1).useAllAvailableWidth();
            lineTable.addCell(new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(BRAND_COLOR, 2f)));
            lineTable.setMarginBottom(15);
            document.add(lineTable);

            // --- 2. TABLA DE DATOS ---
            float[] columnWidths = {2.5f, 1.5f, 1.2f, 1.2f, 1.5f, 1.3f, 1.3f};
            Table table = new Table(UnitValue.createPercentArray(columnWidths)).useAllAvailableWidth();

            String[] headers = {"Nombre", "Categoría", "Stock Actual", "Stock Mín.", "Proveedor / Tel.", "Precio Venta", "Costo Uni."};
            for (String h : headers) {
                // Cabeceras azules con texto blanco, sin bordes verticales
                table.addHeaderCell(new Cell()
                        .add(new Paragraph(h).setBold().setFontSize(9))
                        .setBackgroundColor(BRAND_COLOR)
                        .setFontColor(ColorConstants.WHITE)
                        .setBorder(Border.NO_BORDER)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE)
                        .setPadding(6));
            }

            if (productos == null || productos.isEmpty()) {
                table.addCell(new Cell(1, 7)
                        .add(new Paragraph("No se encontraron productos con los filtros seleccionados."))
                        .setBorder(Border.NO_BORDER)
                        .setBorderBottom(new SolidBorder(BORDER_COLOR, 1f))
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontColor(TEXT_MUTED)
                        .setPadding(15));
            } else {
                boolean isEven = false;
                for (ProductoInventarioDTO p : productos) {
                    DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
                    isEven = !isEven;

                    String prov = p.getProveedorNombre() != null ? p.getProveedorNombre() : "-";
                    if (p.getProveedorTelefono() != null && !p.getProveedorTelefono().isBlank()) {
                        prov += "\nTel: " + p.getProveedorTelefono();
                    }
                    String precioVenta = p.getPrecio() > 0 ? "$" + NUMBER_FORMATTER.format(p.getPrecio()) : "-";
                    String costo = p.getPrecioCosto() != null ? "$" + NUMBER_FORMATTER.format(p.getPrecioCosto()) : "-";

                    // Alertas visuales para el Stock
                    boolean lowStock = p.getStockActual() <= p.getStockMinimo();
                    Paragraph stockPara = new Paragraph(String.valueOf(p.getStockActual())).setFontSize(8);
                    if (lowStock) {
                        stockPara.setFontColor(ALERT_RED).setBold();
                    } else {
                        stockPara.setFontColor(TEXT_DARK);
                    }

                    // Función auxiliar para celdas
                    table.addCell(createCell(p.getNombre() != null ? p.getNombre() : "-", rowBg, TextAlignment.LEFT));
                    table.addCell(createCell(p.getCategoria() != null ? p.getCategoria() : "-", rowBg, TextAlignment.LEFT));
                    
                    Cell stockCell = new Cell().setKeepTogether(true).add(stockPara)
                            .setBackgroundColor(rowBg).setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f))
                            .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(5);
                    table.addCell(stockCell);
                    
                    table.addCell(createCell(String.valueOf(p.getStockMinimo()), rowBg, TextAlignment.CENTER));
                    table.addCell(createCell(prov, rowBg, TextAlignment.LEFT));
                    table.addCell(createCell(precioVenta, rowBg, TextAlignment.RIGHT));
                    table.addCell(createCell(costo, rowBg, TextAlignment.RIGHT));
                }
            }

            document.add(table);
            document.close();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error generando el PDF", e);
        }

        return baos.toByteArray();
    }

    private Cell createCell(String text, DeviceRgb bgColor, TextAlignment alignment) {
        return new Cell().setKeepTogether(true)
                .add(new Paragraph(text).setFontSize(8).setFontColor(TEXT_DARK))
                .setBackgroundColor(bgColor)
                .setBorder(Border.NO_BORDER)
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f)) // Solo borde inferior sutil
                .setTextAlignment(alignment)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPadding(5);
    }

    // Manejador de eventos para el pie de página
    private static class PageEvent implements IEventHandler {
        @Override
        public void handleEvent(Event event) {
            PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
            PdfDocument pdfDoc = docEvent.getDocument();
            PdfPage page = docEvent.getPage();
            int pageNumber = pdfDoc.getPageNumber(page);
            Rectangle pageSize = page.getPageSize();
            
            PdfCanvas canvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdfDoc);
            
            // Dibujar línea fina encima del footer
            canvas.setStrokeColor(BORDER_COLOR)
                  .setLineWidth(0.5f)
                  .moveTo(40, 35)
                  .lineTo(pageSize.getWidth() - 40, 35)
                  .stroke();

            // Footer Text
            Paragraph footerText = new Paragraph("Reporte de Inventario - Sistema de Gestión")
                    .setFontSize(7)
                    .setFontColor(TEXT_MUTED);
            
            Paragraph pageNumberParagraph = new Paragraph("Página " + pageNumber)
                    .setFontSize(7)
                    .setFontColor(TEXT_MUTED);
            
            Canvas htmlCanvas = new Canvas(canvas, new Rectangle(40, 15, pageSize.getWidth() - 80, 20));
            htmlCanvas.showTextAligned(footerText, 40, 15, TextAlignment.LEFT);
            htmlCanvas.showTextAligned(pageNumberParagraph, pageSize.getWidth() - 40, 15, TextAlignment.RIGHT);
            htmlCanvas.close();
        }
    }
}
