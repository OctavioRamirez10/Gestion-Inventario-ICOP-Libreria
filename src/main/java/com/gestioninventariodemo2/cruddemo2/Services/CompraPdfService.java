package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.CompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleCompraResponseDTO;
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
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CompraPdfService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DecimalFormat NUMBER_FORMATTER;

    // Definición de colores de la marca
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

    public byte[] generarPdfCompras(List<CompraResponseDTO> compras, LocalDate inicio, LocalDate fin, String search, String estadoPago, String nombreProveedor) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);
            document.setMargins(40, 40, 60, 40); // Ajuste de márgenes
            pdf.addEventHandler(PdfDocumentEvent.END_PAGE, new PageEvent());

            // ========== CABECERA ==========
            agregarCabecera(document, inicio, fin, search, estadoPago, nombreProveedor);

            // ========== RESUMEN ==========
            if (!compras.isEmpty()) {
                agregarResumen(document, compras);
                // ========== DESGLOSE POR PROVEEDOR ==========
                agregarDesglosePorProveedor(document, compras);
                // ========== TOTALES POR MES ==========
                agregarTotalesPorMes(document, compras);
            }

            // ========== TABLA DE COMPRAS ==========
            agregarTablaCompras(document, compras);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Error al generar PDF de compras", e);
        }
    }

    private void agregarCabecera(Document document, LocalDate inicio, LocalDate fin, String search, String estadoPago, String nombreProveedor) {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
        headerTable.setMarginBottom(15);

        // Columna Izquierda: Logo y Título
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);
        
        Paragraph logo = new Paragraph("SGI")
                .setBold().setFontSize(24)
                .setFontColor(BRAND_COLOR)
                .setMarginBottom(0);
        
        Paragraph title = new Paragraph("Reporte de Compras")
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
        
        String periodoTexto = (inicio != null && fin != null)
                ? inicio.format(DATE_FORMATTER) + " - " + fin.format(DATE_FORMATTER)
                : "Todas las fechas";
        rightCell.add(new Paragraph("Período: " + periodoTexto).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));

        if (search != null && !search.trim().isEmpty()) {
            rightCell.add(new Paragraph("Búsqueda: " + search).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        }
        if (estadoPago != null && !estadoPago.trim().isEmpty()) {
            rightCell.add(new Paragraph("Estado: " + estadoPago).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        }
        if (nombreProveedor != null && !nombreProveedor.trim().isEmpty()) {
            rightCell.add(new Paragraph("Proveedor: " + nombreProveedor).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        }

        headerTable.addCell(leftCell);
        headerTable.addCell(rightCell);
        document.add(headerTable);

        // Línea divisoria elegante
        Table lineTable = new Table(1).useAllAvailableWidth();
        lineTable.addCell(new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(BRAND_COLOR, 2f)));
        lineTable.setMarginBottom(15);
        document.add(lineTable);
    }

    private void agregarResumen(Document document, List<CompraResponseDTO> compras) {
        // Calcular estadísticas
        int totalCompras = compras.size();
        double inversionTotal = compras.stream().mapToDouble(CompraResponseDTO::getTotal).sum();
        int totalProductos = compras.stream()
                .flatMap(c -> c.getProductosComprados().stream())
                .mapToInt(DetalleCompraResponseDTO::getCantidad)
                .sum();

        // Obtener proveedor principal
        Map<String, Integer> proveedoresCount = new HashMap<>();
        for (CompraResponseDTO compra : compras) {
            String proveedor = compra.getNombreProveedor();
            proveedoresCount.put(proveedor, proveedoresCount.getOrDefault(proveedor, 0) + 1);
        }
        String proveedorPrincipal = proveedoresCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        // Crear tabla de resumen estilo "Cards" (1 fila, 4 columnas)
        Table resumenTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1})).useAllAvailableWidth();
        resumenTable.setMarginBottom(20);

        resumenTable.addCell(crearTarjetaResumen("Total Compras", formatNumber(totalCompras)));
        resumenTable.addCell(crearTarjetaResumen("Inversión Total", "$" + formatCurrency(inversionTotal)));
        resumenTable.addCell(crearTarjetaResumen("Total Productos", formatNumber(totalProductos)));
        resumenTable.addCell(crearTarjetaResumen("Prov. Principal", proveedorPrincipal));

        document.add(resumenTable);
    }

    private Cell crearTarjetaResumen(String titulo, String valor) {
        return new Cell().setBorder(Border.NO_BORDER).setPadding(5)
                .add(new Paragraph(titulo).setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2))
                .add(new Paragraph(valor).setFontSize(12).setBold().setFontColor(BRAND_COLOR));
    }

    private void agregarDesglosePorProveedor(Document document, List<CompraResponseDTO> compras) {
        Paragraph titulo = new Paragraph("Desglose por Proveedor")
                .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginTop(10).setMarginBottom(10).setKeepWithNext(true);
        document.add(titulo);

        Map<String, List<CompraResponseDTO>> porProveedor = compras.stream()
                .collect(Collectors.groupingBy(c -> c.getNombreProveedor() != null ? c.getNombreProveedor() : "N/A"));

        List<Map.Entry<String, List<CompraResponseDTO>>> ordenados = porProveedor.entrySet().stream()
                .sorted((a, b) -> Double.compare(
                        b.getValue().stream().mapToDouble(CompraResponseDTO::getTotal).sum(),
                        a.getValue().stream().mapToDouble(CompraResponseDTO::getTotal).sum()))
                .collect(Collectors.toList());

        Table table = new Table(UnitValue.createPercentArray(new float[]{4, 2, 2})).useAllAvailableWidth();
        table.setMarginBottom(20);

        String[] headers = {"Proveedor", "Cant. Compras", "Inversión Total"};
        for (String header : headers) {
            table.addHeaderCell(crearCabeceraCelda(header, TextAlignment.CENTER));
        }

        boolean isEven = false;
        for (Map.Entry<String, List<CompraResponseDTO>> entry : ordenados) {
            DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
            isEven = !isEven;

            double total = entry.getValue().stream().mapToDouble(CompraResponseDTO::getTotal).sum();
            
            table.addCell(crearCeldaDato(entry.getKey(), rowBg, TextAlignment.LEFT));
            table.addCell(crearCeldaDato(String.valueOf(entry.getValue().size()), rowBg, TextAlignment.CENTER));
            table.addCell(crearCeldaDato("$" + formatCurrency(total), rowBg, TextAlignment.RIGHT));
        }

        document.add(table);
    }

    private void agregarTotalesPorMes(Document document, List<CompraResponseDTO> compras) {
        Map<String, Double> porMes = new TreeMap<>();
        DateTimeFormatter mesFormatter = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.forLanguageTag("es-AR"));

        for (CompraResponseDTO compra : compras) {
            if (compra.getFecha() != null) {
                String mes = compra.getFecha().format(mesFormatter);
                porMes.merge(mes, compra.getTotal(), (a, b) -> a + b);
            }
        }

        if (porMes.size() <= 1) return;

        Paragraph titulo = new Paragraph("Totales por Mes")
                .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginTop(10).setMarginBottom(10).setKeepWithNext(true);
        document.add(titulo);

        Table table = new Table(UnitValue.createPercentArray(new float[]{4, 2})).setWidth(UnitValue.createPercentValue(60));
        table.setMarginBottom(20);

        table.addHeaderCell(crearCabeceraCelda("Mes", TextAlignment.CENTER));
        table.addHeaderCell(crearCabeceraCelda("Total Invertido", TextAlignment.CENTER));

        boolean isEven = false;
        for (Map.Entry<String, Double> entry : porMes.entrySet()) {
            DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
            isEven = !isEven;

            String mes = entry.getKey().substring(0, 1).toUpperCase() + entry.getKey().substring(1);
            
            table.addCell(crearCeldaDato(mes, rowBg, TextAlignment.LEFT));
            table.addCell(crearCeldaDato("$" + formatCurrency(entry.getValue()), rowBg, TextAlignment.RIGHT));
        }

        document.add(table);
    }

    private void agregarTablaCompras(Document document, List<CompraResponseDTO> compras) {
        Paragraph tituloTabla = new Paragraph("Detalle de Compras")
                .setFontSize(12).setBold().setFontColor(TEXT_DARK).setMarginTop(10).setMarginBottom(10).setKeepWithNext(true);
        document.add(tituloTabla);

        Table table = new Table(UnitValue.createPercentArray(new float[]{2, 4, 2})).useAllAvailableWidth();

        String[] headers = {"Fecha", "Proveedor", "Total"};
        TextAlignment[] alignments = {TextAlignment.LEFT, TextAlignment.LEFT, TextAlignment.RIGHT};
        for (int i = 0; i < headers.length; i++) {
            table.addHeaderCell(crearCabeceraCelda(headers[i], alignments[i]));
        }

        if (compras.isEmpty()) {
            table.addCell(new Cell(1, 3)
                    .add(new Paragraph("No hay compras registradas en este período"))
                    .setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(BORDER_COLOR, 1f))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(TEXT_MUTED)
                    .setPadding(15));
        } else {
            boolean isEven = false;
            for (CompraResponseDTO compra : compras) {
                DeviceRgb rowBg = isEven ? ROW_EVEN : new DeviceRgb(255, 255, 255);
                isEven = !isEven;

                String fechaStr = formatFecha(compra.getFecha());

                // --- Master Row ---
                table.addCell(crearCeldaDatoSinBordeInferior(fechaStr, rowBg, TextAlignment.LEFT));
                table.addCell(crearCeldaDatoSinBordeInferior(compra.getNombreProveedor(), rowBg, TextAlignment.LEFT));
                table.addCell(crearCeldaDatoSinBordeInferior("$" + formatCurrency(compra.getTotal()), rowBg, TextAlignment.RIGHT));

                // --- Detail Rows (Aligned with Master Columns) ---
                List<DetalleCompraResponseDTO> detalles = compra.getProductosComprados();
                for (int i = 0; i < detalles.size(); i++) {
                    DetalleCompraResponseDTO detalle = detalles.get(i);
                    boolean isLast = (i == detalles.size() - 1);
                    
                    // Celda vacía debajo de Fecha
                    Cell emptyCell = new Cell().setBackgroundColor(rowBg).setBorder(Border.NO_BORDER);
                    if (isLast) emptyCell.setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f));
                    table.addCell(emptyCell);
                    
                    // Producto + Cantidad debajo de Proveedor
                    String prodStr = "↳ " + detalle.getNombreProducto() + " (Cant: " + detalle.getCantidad() + ")";
                    Cell prodCell = new Cell().add(new Paragraph(prodStr).setFontSize(7).setFontColor(TEXT_MUTED))
                            .setBackgroundColor(rowBg).setBorder(Border.NO_BORDER).setPadding(2).setPaddingLeft(10);
                    if (isLast) prodCell.setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f));
                    table.addCell(prodCell);
                    
                    // Subtotal debajo de Total
                    Cell subtotalCell = new Cell().add(new Paragraph("$" + formatCurrency(detalle.getPrecioUnitario() * detalle.getCantidad())).setFontSize(7).setFontColor(TEXT_MUTED))
                            .setBackgroundColor(rowBg).setBorder(Border.NO_BORDER).setPadding(2).setTextAlignment(TextAlignment.RIGHT);
                    if (isLast) subtotalCell.setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f));
                    table.addCell(subtotalCell);
                }
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
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f)) // Solo borde inferior
                .setTextAlignment(alignment)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPadding(5);
    }

    private Cell crearCeldaDatoSinBordeInferior(String text, DeviceRgb bgColor, TextAlignment alignment) {
        return new Cell().setKeepTogether(true)
                .add(new Paragraph(text).setFontSize(8).setFontColor(TEXT_DARK).setBold())
                .setBackgroundColor(bgColor)
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(alignment)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPaddingTop(5)
                .setPaddingLeft(5)
                .setPaddingRight(5)
                .setPaddingBottom(0); // Menos padding abajo para que conecte con la tabla anidada
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
            Paragraph footerText = new Paragraph("Reporte de Compras - Sistema de Gestión")
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

    private String formatFecha(LocalDateTime fecha) {
        if (fecha == null) return "N/A";
        return fecha.format(DATE_TIME_FORMATTER);
    }

    private String formatNumber(int number) {
        return String.format("%,d", number).replace(',', '.');
    }

    private String formatCurrency(double amount) {
        return NUMBER_FORMATTER.format(amount);
    }
}
