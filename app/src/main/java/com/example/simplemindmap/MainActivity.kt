package com.example.simplemindmap

import android.content.ContentResolver
import android.content.ContentValues
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.core.view.drawToBitmap
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.util.Locale
import java.util.UUID
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                MindMapApp()
            }
        }
    }
}

data class MindMapNode(
    val id: String = UUID.randomUUID().toString(),
    val parentId: String?,
    val text: String,
    val x: Float,
    val y: Float
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MindMapApp() {
    val context = LocalContext.current
    val view = LocalView.current
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var sourceText by remember { mutableStateOf("") }
    val nodes = remember { mutableStateListOf<MindMapNode>() }

    var editingNodeId by remember { mutableStateOf<String?>(null) }
    var editText by remember { mutableStateOf("") }
    var childText by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        if (nodes.isEmpty()) {
            nodes += MindMapNode(parentId = null, text = "중앙 주제", x = 460f, y = 700f)
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Simple Mind Map") }) },
        snackbarHost = { SnackbarHost(snackbar) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedTextField(
                value = sourceText,
                onValueChange = { sourceText = it },
                label = { Text("텍스트 입력 (긴 문장 / 키워드)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = {
                    nodes.replaceAll(generateMindMap(sourceText))
                })
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { nodes.replaceAll(generateMindMap(sourceText)) }) {
                    Text("자동 생성")
                }
                Button(onClick = {
                    val bitmap = view.drawToBitmap(Bitmap.Config.ARGB_8888)
                    val uri = saveBitmap(context.contentResolver, bitmap, "mindmap_${System.currentTimeMillis()}.png")
                    scope.launch { snackbar.showSnackbar(if (uri != null) "PNG 저장 완료" else "PNG 저장 실패") }
                }) {
                    Text("PNG 내보내기")
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = {
                    val uri = saveText(
                        context.contentResolver,
                        "mindmap_${System.currentTimeMillis()}.json",
                        "application/json",
                        exportJson(nodes)
                    )
                    scope.launch { snackbar.showSnackbar(if (uri != null) "JSON 저장 완료" else "JSON 저장 실패") }
                }) { Text("JSON") }

                Button(onClick = {
                    val uri = saveText(
                        context.contentResolver,
                        "mindmap_${System.currentTimeMillis()}.md",
                        "text/markdown",
                        exportMarkdown(nodes)
                    )
                    scope.launch { snackbar.showSnackbar(if (uri != null) "Markdown 저장 완료" else "Markdown 저장 실패") }
                }) { Text("Markdown") }
            }

            MindMapCanvas(
                nodes = nodes,
                onMove = { id, dx, dy ->
                    val index = nodes.indexOfFirst { it.id == id }
                    if (index != -1) {
                        val n = nodes[index]
                        nodes[index] = n.copy(x = n.x + dx, y = n.y + dy)
                    }
                },
                onTapNode = { node ->
                    editingNodeId = node.id
                    editText = node.text
                    childText = ""
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
                    .padding(8.dp)
            )
        }
    }

    val selected = nodes.find { it.id == editingNodeId }
    if (selected != null) {
        AlertDialog(
            onDismissRequest = { editingNodeId = null },
            title = { Text("노드 편집") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = editText,
                        onValueChange = { editText = it },
                        label = { Text("텍스트") }
                    )
                    OutlinedTextField(
                        value = childText,
                        onValueChange = { childText = it },
                        label = { Text("하위 노드 추가") }
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    updateNode(nodes, selected.id, editText.ifBlank { "(빈 노드)" })
                    if (childText.isNotBlank()) {
                        val siblingCount = nodes.count { it.parentId == selected.id }
                        nodes += MindMapNode(
                            parentId = selected.id,
                            text = childText.trim(),
                            x = selected.x + 220f,
                            y = selected.y + (siblingCount - 0.5f) * 120f
                        )
                    }
                    editingNodeId = null
                }) { Text("저장") }
            },
            dismissButton = {
                TextButton(onClick = {
                    nodes.removeAll { it.id == selected.id || isDescendantOf(it, selected.id, nodes) }
                    editingNodeId = null
                }) { Text("삭제") }
            }
        )
    }
}

@Composable
private fun MindMapCanvas(
    nodes: List<MindMapNode>,
    onMove: (String, Float, Float) -> Unit,
    onTapNode: (MindMapNode) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val byId = nodes.associateBy { it.id }
            nodes.forEach { node ->
                val parent = node.parentId?.let(byId::get) ?: return@forEach
                val start = Offset(parent.x + 170f, parent.y + 26f)
                val end = Offset(node.x, node.y + 26f)
                val control1 = Offset((start.x + end.x) / 2f, start.y)
                val control2 = Offset((start.x + end.x) / 2f, end.y)
                val path = Path().apply {
                    moveTo(start.x, start.y)
                    cubicTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y)
                }
                drawPath(path = path, color = Color(0xFF6C63FF), style = Stroke(width = 5f, cap = StrokeCap.Round))
            }
        }

        nodes.forEach { node ->
            val animatedX by animateFloatAsState(node.x, label = "nodeX")
            val animatedY by animateFloatAsState(node.y, label = "nodeY")
            val cardColor by animateColorAsState(
                targetValue = if (node.parentId == null) Color(0xFFE7E2FF) else Color.White,
                label = "cardColor"
            )

            ElevatedCard(
                modifier = Modifier
                    .offset { IntOffset(animatedX.roundToInt(), animatedY.roundToInt()) }
                    .size(170.dp, 52.dp)
                    .border(1.dp, Color(0xFF6C63FF), RoundedCornerShape(12.dp))
                    .background(cardColor, RoundedCornerShape(12.dp))
                    .clickable { onTapNode(node) }
                    .pointerInput(node.id) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            onMove(node.id, dragAmount.x, dragAmount.y)
                        }
                    },
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(PaddingValues(horizontal = 10.dp, vertical = 6.dp)),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(text = node.text, style = MaterialTheme.typography.bodyMedium, maxLines = 2)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = if (node.parentId == null) "중심" else "하위",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF6C63FF)
                    )
                }
            }
        }
    }
}

private fun MutableList<MindMapNode>.replaceAll(newNodes: List<MindMapNode>) {
    clear()
    addAll(newNodes)
}

private fun updateNode(nodes: MutableList<MindMapNode>, targetId: String, newText: String) {
    val index = nodes.indexOfFirst { it.id == targetId }
    if (index != -1) {
        nodes[index] = nodes[index].copy(text = newText)
    }
}

private fun generateMindMap(input: String): List<MindMapNode> {
    val fallback = listOf("기획", "기능", "디자인", "개발", "테스트", "배포")
    val clean = input.lowercase(Locale.getDefault()).replace("\n", " ")
    val tokens = Regex("[a-zA-Z가-힣0-9]{2,}").findAll(clean).map { it.value }.toList()
    val stopWords = setOf("그리고", "그러나", "합니다", "대한", "있는", "에서", "으로", "the", "and", "for", "with")

    val ranked = tokens
        .filterNot { it in stopWords }
        .groupingBy { it }
        .eachCount()
        .entries
        .sortedByDescending { it.value }
        .map { it.key }

    val rootText = ranked.firstOrNull()?.replaceFirstChar { it.uppercase() } ?: "중앙 주제"
    val firstNode = MindMapNode(parentId = null, text = rootText, x = 420f, y = 560f)

    val children = (if (ranked.size > 1) ranked.drop(1) else fallback).take(6)
    val nodes = mutableListOf(firstNode)

    children.forEachIndexed { index, keyword ->
        val angleStep = (Math.PI * 2) / children.size.coerceAtLeast(1)
        val radius = 320f
        val cx = 420f + (cos(index * angleStep) * radius).toFloat()
        val cy = 560f + (sin(index * angleStep) * radius).toFloat()

        val child = MindMapNode(parentId = firstNode.id, text = keyword, x = cx, y = cy)
        nodes += child

        ranked
            .filter { it != keyword && it != rootText.lowercase(Locale.getDefault()) }
            .drop(index)
            .take(2)
            .forEachIndexed { subIndex, subKeyword ->
                nodes += MindMapNode(
                    parentId = child.id,
                    text = subKeyword,
                    x = cx + 180f,
                    y = cy + (subIndex - 0.5f) * 110f
                )
            }
    }

    return nodes
}

private fun isDescendantOf(node: MindMapNode, parentId: String, nodes: List<MindMapNode>): Boolean {
    val byId = nodes.associateBy { it.id }
    var currentParent = node.parentId
    while (currentParent != null) {
        if (currentParent == parentId) return true
        currentParent = byId[currentParent]?.parentId
    }
    return false
}

private fun exportJson(nodes: List<MindMapNode>): String {
    val array = JSONArray()
    nodes.forEach { node ->
        array.put(
            JSONObject()
                .put("id", node.id)
                .put("parentId", node.parentId)
                .put("text", node.text)
                .put("x", node.x)
                .put("y", node.y)
        )
    }
    return JSONObject().put("nodes", array).toString(2)
}

private fun exportMarkdown(nodes: List<MindMapNode>): String {
    val byParent = nodes.groupBy { it.parentId }
    val root = nodes.firstOrNull { it.parentId == null } ?: return "# Empty MindMap"

    fun render(node: MindMapNode, depth: Int): String {
        val line = if (depth == 0) "# ${node.text}\n" else "${"  ".repeat(depth - 1)}- ${node.text}\n"
        return line + byParent[node.id].orEmpty().joinToString("") { child -> render(child, depth + 1) }
    }

    return render(root, 0)
}

private fun saveBitmap(resolver: ContentResolver, bitmap: Bitmap, fileName: String): Uri? {
    val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
        put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
        put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/MindMap")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) put(MediaStore.MediaColumns.IS_PENDING, 1)
    }

    val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return null
    return runCatching {
        resolver.openOutputStream(uri)?.use { out -> bitmap.compress(Bitmap.CompressFormat.PNG, 100, out) }
        finalizePendingIfNeeded(resolver, uri, values)
        uri
    }.getOrNull()
}

private fun saveText(resolver: ContentResolver, fileName: String, mimeType: String, content: String): Uri? {
    val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
        put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_DOCUMENTS}/MindMap")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) put(MediaStore.MediaColumns.IS_PENDING, 1)
    }

    val uri = resolver.insert(MediaStore.Files.getContentUri("external"), values) ?: return null
    return writeToUri(resolver, uri, values, content)
}

private fun writeToUri(
    resolver: ContentResolver,
    uri: Uri,
    values: ContentValues,
    content: String
): Uri? {
    return runCatching {
        resolver.openOutputStream(uri)?.use { output: OutputStream ->
            output.write(content.toByteArray())
        }
        finalizePendingIfNeeded(resolver, uri, values)
        uri
    }.getOrNull()
}

private fun finalizePendingIfNeeded(resolver: ContentResolver, uri: Uri, values: ContentValues) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        values.clear()
        values.put(MediaStore.MediaColumns.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
    }
}
