const EN = `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us great between need large often hand high place hold turn without might while number world small home still own point read keep never start city earth eye light thought head under story saw left few along close something seem next hard open example begin life always those both paper together got group often run important until children side feet car mile night walk white sea began grow took river four carry state once book hear stop second later miss idea enough eat face watch far real almost let above girl sometimes mountain cut young talk soon list song being leave family body music color stand sun question fish area mark dog horse bird problem complete room knew since ever piece told usually friend easy heard order red door sure become top ship across today during short better best however low hours black product happen whole measure remember early waves reached listen wind rock space covered fast several`.split(" ");
const VI = `và của có là không người một những được trong cho này đã với các để thì khi đến mình như cũng ra nhiều làm năm về nói lại đi còn sẽ tôi bạn họ chúng ta nhà việc thể từ theo nhưng rất nước sau trên đó nào ngày mới hơn biết thấy phải vào nên đang lên học cả hay bị vì gì chỉ đây đầu lớn cuộc sống thời gian muốn cần nhỏ tay mắt đường xe học sinh trường thầy cô bố mẹ anh chị em con cái bàn ghế cửa sổ trời mưa nắng gió biển núi sông cây hoa lá xanh đỏ vàng trắng đen tốt đẹp xấu vui buồn ăn uống ngủ chơi đọc viết nghe nhìn chạy đứng ngồi yêu thương nhớ quên giúp mở đóng mua bán tiền giờ phút sáng trưa chiều tối đêm hôm nay mai qua tuần tháng xa gần cao thấp dài ngắn nhanh chậm mạnh yếu nóng lạnh ít đủ thật dễ khó đúng sai bắt đầu kết thúc câu chuyện bài hát âm nhạc sách vở bút giấy máy tính điện thoại phố chợ quê hương đất nước bữa cơm phở bánh mì trà sữa cà phê`.split(" ");
export const WORDS = { en: EN, vi: VI };

export const randomWords = (n, lang) => Array.from({ length: n }, () => WORDS[lang][Math.floor(Math.random() * WORDS[lang].length)]);

// đoạn văn tự viết, gõ theo thứ tự; hết đoạn thì nối sang đoạn kế
const TEXTS = {
  en: [
    "The morning train was late again, so she opened her notebook and started to write. Small ideas came first, then a plan for the weekend, then a list of people she wanted to call. By the time the doors opened, the page was full.",
    "A good habit is quiet. It does not ask for attention or praise. It shows up every day, does a little work, and leaves. After a year you look back and wonder how so much changed while nothing seemed to happen at all.",
    "The old bridge over the river had seen more storms than anyone in the village could remember. Children ran across it to school, farmers pushed carts to the market, and at night the lamps along its rail made the water shine like gold.",
    "Learning to type fast is mostly about staying calm. Look at the screen, not your hands, and keep a steady rhythm. Speed comes later, almost by accident, once your fingers stop thinking and simply know where every key lives.",
    "We packed the car before sunrise, with coffee, maps, and far too many snacks. The road climbed slowly into the hills, the radio lost its signal, and for a few hours the only sound was the wind and our own laughter.",
  ],
  vi: [
    "Sáng nay trời mưa nhẹ, phố xá vắng hơn mọi ngày. Tôi ngồi bên cửa sổ, nhâm nhi ly cà phê nóng và nghe tiếng mưa rơi trên mái tôn. Những lúc như vậy, mọi lo toan dường như chậm lại một chút.",
    "Học gõ phím nhanh không khó như nhiều người nghĩ. Điều quan trọng là giữ nhịp đều, mắt nhìn màn hình thay vì nhìn tay. Sau vài tuần luyện tập, các ngón tay sẽ tự nhớ vị trí của từng phím.",
    "Quê tôi có một con sông nhỏ chảy qua giữa làng. Mùa hè, lũ trẻ rủ nhau ra bến tắm, tiếng cười vang cả một khúc sông. Chiều về, mấy chiếc thuyền chở lúa lặng lẽ trôi qua dưới ánh hoàng hôn.",
    "Một thói quen tốt thường rất lặng lẽ. Nó không cần ai khen, cũng chẳng đòi hỏi gì nhiều. Mỗi ngày làm một chút, đều đặn và kiên nhẫn, rồi một năm sau nhìn lại, bạn sẽ bất ngờ vì mình đã đi xa đến vậy.",
    "Tối thứ bảy, cả nhà quây quần bên mâm cơm. Mẹ nấu canh chua, bố kể chuyện hồi còn đi học, còn em út thì tranh phần miếng cá to nhất. Những bữa cơm như thế giản dị mà ấm áp vô cùng.",
  ],
};
export const textWords = (n, lang) => {
  const t = TEXTS[lang];
  const out = [];
  for (let i = Math.floor(Math.random() * t.length); out.length < n; i++) out.push(...t[i % t.length].split(" "));
  return out.slice(0, n);
};
